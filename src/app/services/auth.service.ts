import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../interfaces/user';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isAuthenticated = new BehaviorSubject<boolean>(false);
  private currentUser = new BehaviorSubject<User | null>(null);
  // private bankApiURL = 'https://bankapi.free.beeceptor.com/users';
  private bankApiURL = 'http://localhost:3000/users';

  constructor(private router: Router, private http: HttpClient,private spinnerService: LoadingService) {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      console.log('Found saved user:', savedUser);
      this.currentUser.next(JSON.parse(savedUser));
      this.isAuthenticated.next(true);
    }
  }

  login(email: string, password: string): Observable<User> {
    console.log('Attempting login for email:', email);
    
    // Since Beeceptor is returning a single user object, we'll use User type instead of User[]
    return this.http.get<User[]>(`${this.bankApiURL}?email=${email}`).pipe(
      tap(response => console.log('Server response:', response)),
      map(users => {
        // Check if we received a valid users object
        // if (!users || !users.email) {
        //   console.log('Invalid response format:', users);
        //   throw new Error('Invalid server response');
        // }

        const user = users.find(u=> u.email === email);

        if (!user) {
          console.log('User not found for email:', email);
          throw new Error('User not found');
        }

        // // Check if the email matches
        // if (users.email !== email) {
        //   console.log('Email mismatch:', email);
        //   throw new Error('User not found');
        // }

        // Check if the password matches
        if (user.password !== password) {
          console.log('Password mismatch for user:', email);
          throw new Error('Invalid password');
        }

        console.log('Login successful for user:', user);
        
        // Store users in localStorage and update BehaviorSubjects
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUser.next(user);
        this.isAuthenticated.next(true);
        
        return user;
      }),
      catchError(error => {
        console.error('Login error:', error);
        // Return a more user-friendly error
        if (error.message === 'User not found') {
          return throwError(() => new Error('No account found with this email'));
        } else if (error.message === 'Invalid password') {
          return throwError(() => new Error('Incorrect password'));
        } else {
          return throwError(() => new Error('Login failed. Please try again.'));
        }
      })
    );
  }

  logout(logOutKey?:string): void {
    try {
      this.spinnerService.show();
      setTimeout(()=>{
        localStorage.removeItem('currentUser');
        this.isAuthenticated.next(false);
        this.currentUser.next(null);
        console.log('user logged out.');
        if (logOutKey) {
          this.spinnerService.hide(logOutKey);
        }
        this.spinnerService.clearAll(); // Clear any remaining loading states
        this.router.navigate(['/login']);
      },1500);

    } catch (error) {
      console.error('Error during logout:', error);
      // Handle any errors that might occur during logout
      if (logOutKey) {
        this.spinnerService.hide(logOutKey);
      }
      this.spinnerService.clearAll();
    }
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser.asObservable();
  }

  // Uncomment and use this method when you need to update user balance
  // updateUserBalance(userId: string, newBalance: number): Observable<User> {
  //   return this.http.patch<User>(`${this.bankApiURL}/${userId}`, { balance: newBalance }).pipe(
  //     tap(updatedUser => {
  //       const currentUser = this.currentUser.getValue();
  //       if (currentUser && currentUser.id === userId) {
  //         const updatedCurrentUser = { ...currentUser, balance: newBalance };
  //         localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
  //         this.currentUser.next(updatedCurrentUser);
  //       }
  //     }),
  //     catchError(error => {
  //       console.error('Error updating balance:', error);
  //       return throwError(() => new Error('Failed to update balance. Please try again.'));
  //     })
  //   );
  // }
}