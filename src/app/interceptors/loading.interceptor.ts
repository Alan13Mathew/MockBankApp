import { 
  HttpEvent, 
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest, 
  HttpResponse, 
  HttpErrorResponse 
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, tap } from 'rxjs';
import { LoadingService } from '../services/loading.service';

// State management (moved from class properties)
let totalRequests = 0;
let completedRequests = 0;

// URLs that should not trigger the loading spinner
const excludedUrls: string[] = [
  '/health-check',
  '/polling-endpoint'
];

// Helper functions
const shouldExclude = (url: string): boolean => {
  return excludedUrls.some(excludedUrl => url.includes(excludedUrl));
};

const createLoadingKey = (request: HttpRequest<unknown>): string => {
  return `${request.method}-${request.url}-${Date.now()}`;
};

const resetCounters = (): void => {
  totalRequests = 0;
  completedRequests = 0;
};

export const loadingInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Inject the loading service
  const loadingService = inject(LoadingService);

  // Check if the request URL should be excluded
  if (shouldExclude(request.url)) {
    return next(request);
  }

  // Create a unique key for this request
  const loadingKey = createLoadingKey(request);
  
  // Increment total requests counter
  totalRequests++;
  
  // Only show loading if it's the first request
  if (totalRequests === 1) {
    loadingService.show(loadingKey);
  }

  const handleRequestCompletion = (loadingKey: string): void => {
    completedRequests++;
    
    // If all requests are complete, hide the loader
    if (completedRequests === totalRequests) {
      resetCounters();
      loadingService.hide(loadingKey);
    }
  };

  const handleRequestFinalization = (loadingKey: string): void => {
    // Decrement total requests counter
    totalRequests--;
    
    // If no more pending requests, ensure loading is hidden
    if (totalRequests === 0) {
      resetCounters();
      loadingService.hide(loadingKey);
    }
  };

  return next(request).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          handleRequestCompletion(loadingKey);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      handleRequestCompletion(loadingKey);
      throw error;
    }),
    finalize(() => {
      handleRequestFinalization(loadingKey);
    })
  );
};