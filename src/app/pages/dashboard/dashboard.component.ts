import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../../interfaces/user';
import { MatButtonModule } from '@angular/material/button';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { BankingService } from '../../services/banking.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { LoadingService } from '../../services/loading.service';
import { SendComponent } from '../send/send.component';
import { BalanceHistory } from '../../interfaces/balance-history';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule,SendComponent, MatIconModule, MatButtonModule, CommonModule],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.3s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  totalBalance: number = 0;
  monthlyIncome: number = 0;
  monthlyExpenses: number = 0;
  currentUser: User | null = null;
  balanceHistory: BalanceHistory[] = [];
  recentTransactions: any[] = [];
  isLoading: boolean = false;

  constructor(
    private authService: AuthService,
    private bankingService: BankingService,
    private router: Router,
    private loadingService: LoadingService 
  ) {}

  get maxBalance(): number {
    return Math.max(...this.balanceHistory.map(item => item.amount));
  }

  ngOnInit() {
    this.loadingService.clearAll();
    this.loadCurrentUser();
  }

  private loadCurrentUser() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUser = JSON.parse(userData);
      this.loadDashboardData();
    } else {
      this.loadingService.clearAll();
      this.router.navigate(['/login']);
    }
  }

  private loadDashboardData() {
    if (!this.currentUser?.email){
      this.loadingService.clearAll();
      return;
    } 

    const loadingKeys = {
      dashboard: 'dashboard-data-' + Date.now(),
      transactions: 'transactions-data-' + Date.now(),
      balance: 'balance-data-' + Date.now()
    };

    
    this.loadingService.show(loadingKeys.dashboard);

    // Load dashboard summary data
    this.bankingService.getDashboardData(this.currentUser.email)
      .pipe(
        catchError(error => {
          console.error('Error loading dashboard data:', error);
          return of({
            totalBalance: 0,
            monthlyIncome: 0,
            monthlyExpenses: 0
          });
        }),
        finalize(() => this.loadingService.hide(loadingKeys.dashboard))
      )
      .subscribe(data => {
        this.totalBalance = data.totalBalance;
        this.monthlyIncome = data.monthlyIncome;
        this.monthlyExpenses = data.monthlyExpenses;
      });

    // Load recent transactions
    this.loadingService.show(loadingKeys.transactions);
    this.bankingService.getRecentTransactions(this.currentUser.email)
      .pipe(
        catchError(error => {
          console.error('Error loading transactions:', error);
          return of([]);
        }),
        finalize(() => this.loadingService.hide(loadingKeys.transactions))
      )
      .subscribe(transactions => {
        this.recentTransactions = transactions;
      });

    // Load balance history
    this.loadingService.show(loadingKeys.balance);
    this.bankingService.getBalanceHistory()
      .pipe(
        catchError(error => {
          console.error('Error loading balance history:', error);
          return of([]);
        }),
        finalize(() => this.loadingService.hide(loadingKeys.balance))
      )
      .subscribe((history:BalanceHistory[]) => {
        this.balanceHistory = history;
      });
  }

  handleTransaction(type: 'credit' | 'debit', amount: number) {
    if (!this.currentUser?.email) return;

    const transactionKey = `transaction-${type}-${Date.now()}`;
    this.loadingService.show(transactionKey);

    this.bankingService.updateBalance(this.currentUser.email, amount, type)
      .pipe(
        catchError(error => {
          console.error(`Error processing ${type}:`, error);
          return of(void 0);
        }),
        finalize(() => {
          // this.isLoading = false;
          this.loadingService.hide(transactionKey);
          this.loadDashboardData();
        })
      )
      .subscribe();
  }

  logout() {
    const logoutKey = 'logout-' + Date.now();
    this.loadingService.show(logoutKey);
    this.authService.logout(logoutKey);  }

    refreshDashboard() {
      this.loadDashboardData();
    }
}