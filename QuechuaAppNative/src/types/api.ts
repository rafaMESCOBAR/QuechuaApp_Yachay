//types/api.ts

export interface DetectedObject {
    label: string;
    spanish: string;
    quechua: string;
    confidence: number;
    bbox: number[];
  }
  
  export interface DetectionResponse {
    objects: DetectedObject[];
    count: number;
    message: string;
  }