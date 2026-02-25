export type Platform = 'FB' | 'IG' | 'LINE' | 'ALL';

export type PostStatus = 'success' | 'scheduled' | 'failed' | 'unpublished';

export interface HistoryRecord {
  id: string;
  publishTime: string; // ISO date string
  platform: Platform;
  campaign: string;
  product?: string;
  copyContent: string;
  status: PostStatus;
  engagementTotal?: number;
  engagementLikes?: number;
  engagementComments?: number;
  engagementShares?: number;
  platformUrl?: string;
  lastUpdated?: string; // ISO date string
}

export interface HistoryMetrics {
  posts: number;
  totalEngagement: number;
  avgEngagement: number;
}

export interface HistoryFilters {
  dateRange: 'today' | '7days' | '30days' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  platform: Platform;
  keyword?: string;
}

export interface HistoryQueryParams extends HistoryFilters {
  page?: number;
  pageSize?: number;
  sortBy?: 'publishTime';
  sortOrder?: 'asc' | 'desc';
}
