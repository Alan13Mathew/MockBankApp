import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';


@Component({
  selector: 'app-recieve',
  standalone: true,
  imports: [ReactiveFormsModule,MatButtonModule,MatInputModule,MatFormFieldModule,CommonModule],
  templateUrl: './recieve.component.html',
  styleUrl: './recieve.component.css'
})
export class RecieveComponent {
  receiveForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.receiveForm = this.fb.group({
      senderName: ['', Validators.required],
      amount: [null, [Validators.required, Validators.min(1)]],
      reference: ['']
    });
  }

  onReceiveMoney() {
    if (this.receiveForm.valid) {
      console.log("Receiving Money:", this.receiveForm.value);
      alert('Money received successfully!');
      this.receiveForm.reset();
    } else {
      this.receiveForm.markAllAsTouched();
    }
  }

}
