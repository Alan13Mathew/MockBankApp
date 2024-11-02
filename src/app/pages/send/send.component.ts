import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BankingService } from '../../services/banking.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LoadingService } from '../../services/loading.service';
import { finalize, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-send',
  standalone: true,
  imports: [ReactiveFormsModule,CommonModule,MatCardModule,MatFormFieldModule,MatInputModule,MatButtonModule,MatIconModule],
  templateUrl: './send.component.html',
  styleUrl: './send.component.css'
})
export class SendComponent implements OnInit {
  sendMoneyForm: FormGroup;
  isTransactionInProgress = false;
  currentUserEmail: string | null = null;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private bankingService: BankingService,
    private loadingService: LoadingService
  ) {
    this.sendMoneyForm = this.fb.group({
      recipientEmail: ['', [Validators.required, Validators.email]],
      amount: [null, [Validators.required, Validators.min(1)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      this.currentUserEmail = JSON.parse(userData).email;
    }
  }

  onSubmit(): void {
    if (this.sendMoneyForm.invalid || !this.currentUserEmail || this.isTransactionInProgress) {
      return;
    }

    const { recipientEmail, amount, description } = this.sendMoneyForm.value;

    // Validate recipient email
    if (recipientEmail === this.currentUserEmail) {
      this.showError('Cannot send money to yourself');
      return;
    }

    this.isTransactionInProgress = true;
    const loadingKey = `send-money-${Date.now()}`;
    this.loadingService.show(loadingKey);

    // First verify recipient exists
    this.bankingService.verifyUser(recipientEmail)
      .pipe(
        switchMap(exists => {
          if (!exists) {
            throw new Error('Recipient account not found');
          }
          return this.bankingService.transferMoney(
            this.currentUserEmail!,
            recipientEmail,
            amount,
            description || 'Money Transfer'
          );
        }),
        finalize(() => {
          this.isTransactionInProgress = false;
          this.loadingService.hide(loadingKey);
        })
      )
      .subscribe({
        next: () => {
          this.showSuccess();
          this.sendMoneyForm.reset();
        },
        error: (error) => this.handleError(error)
      });
  }

  private showSuccess(): void {
    this.snackBar.open('Money sent successfully!', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }

  private handleError(error: any): void {
    console.error('Transaction error:', error);
    this.showError(error.message || 'Transaction failed. Please try again.');
  }
}
