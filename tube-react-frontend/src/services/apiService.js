import { API_BASE_URL } from "../config/firebase";

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const finalOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, finalOptions);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error: ${response.status} - ${errorText.substring(0, 200)}`
        );
      }

      // Handle different response types
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const jsonData = await response.json();
        return jsonData;
      } else {
        const textData = await response.text();
        throw new Error(
          `Expected JSON but got ${
            contentType || "unknown"
          }: ${textData.substring(0, 100)}...`
        );
      }
    } catch (error) {
      // Add more debug info to the error message
      const errorMessage = `API request failed to ${url}: ${error.message}`;
      throw new Error(errorMessage);
    }
  }

  // Video info endpoint
  async getVideoInfo(youtubeUrl) {
    return this.request("/video-info", {
      method: "POST",
      body: JSON.stringify({ youtube_url: youtubeUrl }),
    });
  }

  // Extract audio endpoint
  async extractAudio(extractionData) {
    return this.request("/extract", {
      method: "POST",
      body: JSON.stringify(extractionData),
    });
  }

  // Get job status
  async getJobStatus(jobId) {
    return this.request(`/status/${jobId}`);
  }

  // Get file info
  async getFileInfo(fileId) {
    return this.request(`/file/${fileId}`);
  }

  // Get download URL
  getDownloadUrl(fileId) {
    return `${this.baseURL}/download/${fileId}`;
  }

  // Get thumbnail URL
  getThumbnailUrl(fileId) {
    return `${this.baseURL}/thumbnail/${fileId}`;
  }

  // Get screenshot URL
  getScreenshotUrl(fileId) {
    return `${this.baseURL}/screenshot/${fileId}`;
  }

  // Health check
  async healthCheck() {
    return this.request("/health");
  }
}

export default new ApiService();
