// src/app/services/loading.service.ts
// Update the LoadingService to include request tracking
// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class LoadingService {
//   private loadingSubject = new BehaviorSubject<boolean>(false);
//   private loadingMap = new Map<string, boolean>();
//   private requestsInProgress = new Set<string>();

//   show(key: string = 'global'): void {
//     this.requestsInProgress.add(key);
//     this.loadingMap.set(key, true);
//     this.updateLoading();
//   }

//   hide(key: string = 'global'): void {
//     this.requestsInProgress.delete(key);
//     this.loadingMap.delete(key);
//     this.updateLoading();
//   }

//   private updateLoading(): void {
//     this.loadingSubject.next(this.requestsInProgress.size > 0);
//   }

//   isLoading(): Observable<boolean> {
//     return this.loadingSubject.asObservable();
//   }

//   // Get the current number of requests in progress
//   getRequestCount(): number {
//     return this.requestsInProgress.size;
//   }

//   // Clear all loading states (useful for error scenarios)
//   clearAll(): void {
//     this.requestsInProgress.clear();
//     this.loadingMap.clear();
//     this.updateLoading();
//   }
// }

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private activeRequests: Set<string> = new Set();
  private timeouts: Map<string, any> = new Map();

  show(requestId: string = 'global'): void {
   // Clear any existing timeout for this requestId
   if (this.timeouts.has(requestId)) {
    clearTimeout(this.timeouts.get(requestId));
    this.timeouts.delete(requestId);
    }
    this.activeRequests.add(requestId);
    this.updateLoadingState();
       // Set a safety timeout to clear this loading state
       const timeout = setTimeout(() => {
        this.hide(requestId);
        console.warn(`Loading state for ${requestId} was forcibly cleared after timeout`);
      }, 3000); // 3 second safety timeout
  
      this.timeouts.set(requestId, timeout);
  }

  hide(requestId: string = 'global'): void {
     // Clear the timeout if it exists
     if (this.timeouts.has(requestId)) {
      clearTimeout(this.timeouts.get(requestId));
      this.timeouts.delete(requestId);
    }

    this.activeRequests.delete(requestId);
    this.updateLoadingState();
  }

  private updateLoadingState(): void {
    this.loadingSubject.next(this.activeRequests.size > 0);
  }

  isLoading(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  clearAll(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    
    this.activeRequests.clear();
    this.updateLoadingState();
  }
}