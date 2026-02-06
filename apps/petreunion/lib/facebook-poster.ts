/**
 * Facebook Poster Service
 * Posts "Pet of the Day" to Facebook Page
 * Uses Facebook Graph API
 */

export interface PetOfTheDay {
  id: string;
  pet_name: string | null;
  pet_type: string;
  breed: string | null;
  color: string;
  size: string | null;
  age: string | null;
  gender: string | null;
  description: string | null;
  location_city: string | null;
  location_state: string | null;
  photo_url: string | null;
  status: 'lost' | 'found';
  date_lost?: string | null;
  date_found?: string | null;
  created_at: string;
}

export interface FacebookPostResult {
  success: boolean;
  postId?: string;
  message?: string;
  error?: string;
}

export class FacebookPoster {
  private pageAccessToken: string;
  private pageId: string;
  private apiVersion: string;

  constructor() {
    this.pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
    this.pageId = process.env.FACEBOOK_PAGE_ID || '';
    this.apiVersion = process.env.FACEBOOK_API_VERSION || 'v18.0';
  }

  /**
   * Check if Facebook is configured
   */
  isConfigured(): boolean {
    return !!(this.pageAccessToken && this.pageId);
  }

  /**
   * Format pet information into a Facebook post message
   */
  formatPetPost(pet: PetOfTheDay): string {
    const emoji = pet.pet_type === 'dog' ? '🐕' : pet.pet_type === 'cat' ? '🐱' : '🐾';
    const statusEmoji = pet.status === 'lost' ? '🔍' : '🏠';
    
    let message = `${emoji} PET OF THE DAY ${statusEmoji}\n\n`;
    
    if (pet.pet_name) {
      message += `Name: ${pet.pet_name}\n`;
    }
    
    message += `Type: ${pet.pet_type.charAt(0).toUpperCase() + pet.pet_type.slice(1)}\n`;
    
    if (pet.breed && pet.breed !== 'Unknown') {
      message += `Breed: ${pet.breed}\n`;
    }
    
    message += `Color: ${pet.color}\n`;
    
    if (pet.size) {
      message += `Size: ${pet.size}\n`;
    }
    
    if (pet.age) {
      message += `Age: ${pet.age}\n`;
    }
    
    if (pet.gender) {
      message += `Gender: ${pet.gender}\n`;
    }
    
    if (pet.location_city || pet.location_state) {
      const location = [pet.location_city, pet.location_state].filter(Boolean).join(', ');
      message += `Location: ${location}\n`;
    }
    
    if (pet.status === 'lost' && pet.date_lost) {
      message += `Lost: ${new Date(pet.date_lost).toLocaleDateString()}\n`;
    } else if (pet.status === 'found' && pet.date_found) {
      message += `Found: ${new Date(pet.date_found).toLocaleDateString()}\n`;
    }
    
    if (pet.description) {
      message += `\nDescription: ${pet.description}\n`;
    }
    
    message += `\n${pet.status === 'lost' ? 'Help reunite this pet with their family!' : 'Help find this pet\'s owner!'} 🐾\n\n`;
    message += `Visit PetReunion.org to search for matches or report a pet.\n`;
    message += `#PetOfTheDay #PetReunion #LostPets #FoundPets`;
    
    if (pet.location_city) {
      message += ` #${pet.location_city.replace(/\s+/g, '')}`;
    }
    if (pet.location_state) {
      message += ` #${pet.location_state}`;
    }
    
    return message;
  }

  /**
   * Upload photo to Facebook and get photo ID
   * Uses URL method (simpler and more reliable)
   */
  private async uploadPhoto(photoUrl: string): Promise<string | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      // Upload photo using URL method
      const uploadUrl = `https://graph.facebook.com/${this.apiVersion}/${this.pageId}/photos`;
      
      const params = new URLSearchParams({
        url: photoUrl,
        published: 'false', // Don't publish yet, we'll attach to post
        access_token: this.pageAccessToken,
      });

      const response = await fetch(`${uploadUrl}?${params.toString()}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Facebook photo upload error:', error);
        return null;
      }

      const data = await response.json();
      return data.id || null;
    } catch (error) {
      console.error('Error uploading photo to Facebook:', error);
      return null;
    }
  }

  /**
   * Post to Facebook Page
   */
  async postPetOfTheDay(pet: PetOfTheDay): Promise<FacebookPostResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Facebook not configured. Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID',
      };
    }

    try {
      const message = this.formatPetPost(pet);
      const postUrl = `https://graph.facebook.com/${this.apiVersion}/${this.pageId}/feed`;

      // Prepare post data
      const postData: any = {
        message,
        access_token: this.pageAccessToken,
      };

      // If pet has a photo, try to upload it first
      if (pet.photo_url) {
        try {
          const photoId = await this.uploadPhoto(pet.photo_url);
          if (photoId) {
            // Attach uploaded photo to post
            postData.attached_media = JSON.stringify([{ media_fbid: photoId }]);
          } else {
            // Fallback: include photo URL (Facebook will create link preview)
            postData.link = pet.photo_url;
          }
        } catch (photoError) {
          console.warn('Photo upload failed, using link preview:', photoError);
          // Fallback to link preview
          postData.link = pet.photo_url;
        }
      }

      // Post to Facebook
      const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Facebook post error:', error);
        return {
          success: false,
          error: error.error?.message || 'Failed to post to Facebook',
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        postId: data.id,
        message: 'Pet of the Day posted successfully to Facebook',
      };
    } catch (error: any) {
      console.error('Error posting to Facebook:', error);
      return {
        success: false,
        error: error.message || 'Unknown error posting to Facebook',
      };
    }
  }

  /**
   * Alternative method: Post with photo URL directly (simpler)
   */
  async postPetOfTheDayWithPhoto(pet: PetOfTheDay): Promise<FacebookPostResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Facebook not configured',
      };
    }

    try {
      const message = this.formatPetPost(pet);
      const postUrl = `https://graph.facebook.com/${this.apiVersion}/${this.pageId}/feed`;

      const postData: any = {
        message,
        access_token: this.pageAccessToken,
      };

      // If photo exists, include it as a link (Facebook will auto-preview)
      if (pet.photo_url) {
        postData.link = pet.photo_url;
      }

      const response = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to post',
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        postId: data.id,
        message: 'Posted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
