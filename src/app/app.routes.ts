import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SendComponent } from './pages/send/send.component';
import { RecieveComponent } from './pages/recieve/recieve.component';
import { TransactionListComponent } from './pages/transaction-list/transaction-list.component';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [loginGuard]
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'send-money',
        component: SendComponent,
        canActivate: [authGuard]
    },
    {
        path: 'recieve-money',
        component: RecieveComponent,
        canActivate: [authGuard]
    },
    {
        path: 'transactions',
        component: TransactionListComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: '/dashboard'
    }
];
