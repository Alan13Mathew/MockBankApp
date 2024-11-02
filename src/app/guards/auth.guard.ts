import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.isLoggedIn().pipe(
    take(1),
    map(isloggedIn=>{
      console.log('Auth Guard - is logged in: ',isloggedIn);
      if(isloggedIn){
        return true;
      }
      console.log( 'Access Denied - Redirecting to login' );
      router.navigate(['/login']);
      return false;
    })
  );

};


export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return authService.isLoggedIn().pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn) {
        console.log('Already logged in - Redirecting to dashboard');
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    })
  );
};
