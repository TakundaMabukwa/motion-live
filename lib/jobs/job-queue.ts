import { Logger } from '@/lib/logger';

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Job interface
 */
export interface Job {
  id: string;
  name: string;
  execute: () => Promise<void>;
  maxRetries?: number;
  priority?: number;
}

/**
 * Job result
 */
export interface JobResult {
  id: string;
  status: JobStatus;
  startTime: Date;
  endTime?: Date;
  error?: Error;
}

/**
 * Simple in-memory job queue system
 */
export class JobQueue {
  private static instance: JobQueue;
  private queue: Job[] = [];
  private results: Map<string, JobResult> = new Map();
  private isProcessing: boolean = false;
  private logger: Logger;
  
  private constructor() {
    this.logger = new Logger('JobQueue');
  }
  
  /**
   * Get the singleton job queue instance
   */
  public static getInstance(): JobQueue {
    if (!JobQueue.instance) {
      JobQueue.instance = new JobQueue();
    }
    return JobQueue.instance;
  }
  
  /**
   * Add a job to the queue
   * @param job The job to add
   */
  public enqueue(job: Job): void {
    this.logger.info(`Adding job to queue: ${job.name}`, { jobId: job.id });
    this.queue.push(job);
    this.results.set(job.id, {
      id: job.id,
      status: JobStatus.PENDING,
      startTime: new Date()
    });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }
  
  /**
   * Get the result of a job
   * @param jobId The job ID
   * @returns The job result or undefined if not found
   */
  public getResult(jobId: string): JobResult | undefined {
    return this.results.get(jobId);
  }
  
  /**
   * Check if a job is complete
   * @param jobId The job ID
   * @returns True if the job is complete, false otherwise
   */
  public isJobComplete(jobId: string): boolean {
    const result = this.results.get(jobId);
    return result?.status === JobStatus.COMPLETED || result?.status === JobStatus.FAILED;
  }
  
  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }
    
    this.isProcessing = true;
    
    // Sort by priority (higher number = higher priority)
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    const job = this.queue.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }
    
    this.logger.info(`Processing job: ${job.name}`, { jobId: job.id });
    
    // Update status
    const result = this.results.get(job.id)!;
    result.status = JobStatus.RUNNING;
    
    try {
      await job.execute();
      
      // Update result
      result.status = JobStatus.COMPLETED;
      result.endTime = new Date();
      
      this.logger.info(`Job completed: ${job.name}`, { jobId: job.id });
    } catch (error) {
      this.logger.error(`Job failed: ${job.name}`, error as Error, { jobId: job.id });
      
      // Update result
      result.status = JobStatus.FAILED;
      result.endTime = new Date();
      result.error = error as Error;
    }
    
    // Process next job
    setTimeout(() => this.processQueue(), 0);
  }
}
