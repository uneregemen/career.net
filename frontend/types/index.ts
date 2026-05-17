export interface Job {
  id: string;
  title: string;
  description: string;
  companyName: string;
  companyId: string;
  country: string;
  city: string;
  town: string;
  workingPreference: "FULLTIME" | "PARTTIME" | "REMOTE" | "HYBRID";
  requirements: string;
  salaryRange: string;
  postedAt: string;
  active: boolean;
}

export interface JobPage {
  content: Job[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface JobSearch {
  id: string;
  position: string;
  city: string;
  filters: { country?: string; town?: string; workingPreference?: string };
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  jobId: string;
  read: boolean;
  createdAt: string;
}

export interface JobAlert {
  id: string;
  positionKeywords: string;
  city: string;
  workingPreference: string;
  active: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  city: string;
  workingPreference: string;
  requirements: string;
}

export interface ChatResponse {
  sessionId: string;
  text: string;
  jobCards: JobCard[];
}

export type WorkingPreference = "FULLTIME" | "PARTTIME" | "REMOTE" | "HYBRID";
