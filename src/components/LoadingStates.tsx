
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  </div>
);

export const BookingConfigSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/4" />
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </CardContent>
  </Card>
);

export const BookingStatusSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-6 w-1/3" />
    </div>
    <Skeleton className="h-20 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

export const CenteredLoader = ({ message = "Laddar..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12 space-y-4">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    <p className="text-gray-600">{message}</p>
  </div>
);

export const InlineLoader = ({ message }: { message?: string }) => (
  <div className="flex items-center gap-2 text-sm text-gray-600">
    <Loader2 className="h-4 w-4 animate-spin" />
    {message && <span>{message}</span>}
  </div>
);

export const ButtonLoader = () => (
  <Loader2 className="h-4 w-4 animate-spin" />
);
