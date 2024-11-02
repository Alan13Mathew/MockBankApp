import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, switchMap, forkJoin, catchError, throwError, of } from 'rxjs';
import { User } from '../interfaces/user';
import { BalanceHistory } from '../interfaces/balance-history';

interface Transaction {
  id: number;
  type: 'credit' | 'debit';
  email: string;
  amount: number;
  description: string;
  date: string;
}

interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

@Injectable({
  providedIn: 'root'
})
export class BankingService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      errorMessage = `${error.error?.message || 'Operation failed. Please try again.'}`;
    }
    return throwError(() => new Error(errorMessage));
  }

  private getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  getCurrentUser(email: string): Observable<User | null> {
    if (!email) {
      return throwError(() => new Error('Email is required'));
    }

    return this.http.get<User[]>(`${this.apiUrl}/users?email=${email}`).pipe(
      map(users => users[0] || null),
      catchError(this.handleError)
    );
  }

  transferMoney(fromEmail: string, toEmail: string, amount: number, description: string): Observable<void> {
    if (!fromEmail || !toEmail || amount <= 0) {
      return throwError(() => new Error('Invalid transfer parameters'));
    }

    if (fromEmail === toEmail) {
      return throwError(() => new Error('Cannot transfer money to the same account'));
    }

    // First get both users
    return forkJoin([
      this.getCurrentUser(fromEmail),
      this.getCurrentUser(toEmail)
    ]).pipe(
      switchMap(([sender, recipient]) => {
        if (!sender || !recipient) {
          throw new Error('One or both users not found');
        }

        if (sender.balance < amount) {
          throw new Error('Insufficient balance');
        }

        //create debit transaction 
        const debitTransaction = {
          type: 'debit' as const,
          email: fromEmail,
          amount,
          description: `Transfer to ${toEmail}: ${description}`,
          date: new Date().toISOString()
        };
        // create credit transaction
        const creditTransaction = {
          type: 'credit' as const,
          email: toEmail,
          amount,
          description: `Received from ${fromEmail}: ${description}`,
          date: new Date().toISOString()
        };

        // Update both users with new balances
        return forkJoin([
          // Update sender
          this.http.patch<User>(`${this.apiUrl}/users/${sender.id}`, {
            balance: sender.balance - amount
          }),
          // Update recipient
          this.http.patch<User>(`${this.apiUrl}/users/${recipient.id}`, {
            balance: recipient.balance + amount
          }),
          // Add both transactions
          this.addTransaction(debitTransaction),
          this.addTransaction(creditTransaction)
        ]);
      }),
      map(() => undefined),
      catchError(error => {
        console.error('Transfer error:', error);
        return throwError(() => new Error(error.message || 'Transfer failed. Please try again.'));
      })
    );
  }

  updateBalance(email: string, amount: number, type: 'credit' | 'debit'): Observable<void> {
    if (!email || amount <= 0) {
      return throwError(() => new Error('Invalid parameters'));
    }

    return this.getCurrentUser(email).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('User not found');
        }

        const newBalance = type === 'credit' ? 
          user.balance + amount : 
          user.balance - amount;

        if (type === 'debit' && newBalance < 0) {
          throw new Error('Insufficient balance');
        }

        return forkJoin([
          this.http.patch<User>(`${this.apiUrl}/users/${user.id}`, { balance: newBalance }),
          this.addTransaction({
            type,
            email,
            amount,
            description: `${type === 'credit' ? 'Deposit' : 'Withdrawal'} - ${new Date().toLocaleString()}`,
            date: new Date().toISOString()
          })
        ]).pipe(
          map(() => undefined)
        );
      }),
      catchError(this.handleError)
    );
  }

  // Rest of the service methods remain the same...
  getDashboardData(email: string): Observable<DashboardData> {
    if (!email) {
      return throwError(() => new Error('Email is required'));
    }

    return forkJoin({
      user: this.getCurrentUser(email),
      transactions: this.http.get<{ recentTransactions: Transaction[] }>(`${this.apiUrl}/transactions`)
    }).pipe(
      map(({ user, transactions }) => {
        if (!user) {
          throw new Error('User not found');
        }

        const userTransactions = transactions.recentTransactions.filter(t => t.email === email);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const currentMonthTransactions = userTransactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === currentMonth && 
                 transactionDate.getFullYear() === currentYear;
        });

        const monthlyIncome = currentMonthTransactions
          .filter(t => t.type === 'credit')
          .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = currentMonthTransactions
          .filter(t => t.type === 'debit')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          totalBalance: user.balance || 0,
          monthlyIncome,
          monthlyExpenses
        };
      }),
      catchError(this.handleError)
    );
  }

  getRecentTransactions(email: string): Observable<Transaction[]> {
    if (!email) {
      return throwError(() => new Error('Email is required'));
    }

    return this.http.get<{ recentTransactions: Transaction[] }>(`${this.apiUrl}/transactions`).pipe(
      map(response => {
        if (!response?.recentTransactions) {
          throw new Error('Invalid transaction data received');
        }
        return response.recentTransactions
          .filter(t => t.email === email)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
      }),
      catchError(this.handleError)
    );
  }

  private addTransaction(transaction: Omit<Transaction, 'id'>): Observable<Transaction> {
    return this.http.get<{ recentTransactions: Transaction[] }>(`${this.apiUrl}/transactions`).pipe(
      switchMap(response => {
        if (!response?.recentTransactions) {
          throw new Error('Invalid transaction data');
        }

        const newId = Math.max(0, ...response.recentTransactions.map(t => t.id)) + 1;
        const newTransaction = { ...transaction, id: newId };
        
        const updatedTransactions = {
          recentTransactions: [newTransaction, ...response.recentTransactions]
        };

        return this.http.patch<{ recentTransactions: Transaction[] }>(
          `${this.apiUrl}/transactions`,
          updatedTransactions
        ).pipe(
          map(() => newTransaction)
        );
      }),
      catchError(this.handleError)
    );
  }

  verifyUser(email: string): Observable<boolean> {
    if (!email) {
      return throwError(() => new Error('Email is required'));
    }
    
    return this.getCurrentUser(email).pipe(
      map(user => !!user),
      catchError(() => of(false))
    );
  }

  getBalanceHistory(): Observable<BalanceHistory[]> {
    return this.http.get<{ balanceHistory: BalanceHistory[] }>(`${this.apiUrl}/transactions`).pipe(
      map(response => {
        if (!response?.balanceHistory) {
          return [];
        }
        return response.balanceHistory.sort((a, b) => {
          const monthA = new Date(a.month).getTime();
          const monthB = new Date(b.month).getTime();
          return monthA - monthB;
        });
      }),
      catchError(error => {
        console.error('Error fetching balance history:', error);
        return of([]);
      })
    );
  }
}