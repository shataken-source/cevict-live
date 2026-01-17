import { createClient } from '@/lib/supabase'

interface SimilarPet {
  pet_id: string
  similarity: number
  photo_url: string
  match_type: 'lost_found' | 'found_found' | 'lost_lost'
}

interface PetMatchResult {
  success: boolean
  features?: string // AI-extracted pet features
  embedding_generated: boolean
  similar_pets: SimilarPet[]
}

export class PetAIService {
  private supabase = createClient()

  async generateEmbeddingAndMatch(
    petId: string,
    photoUrl: string,
    photoBase64?: string
  ): Promise<PetMatchResult> {
    try {
      const { data, error } = await this.supabase.functions.invoke<PetMatchResult>(
        'generate-pet-embedding',
        {
          body: {
            pet_id: petId,
            photo_url: photoUrl,
            photo_base64: photoBase64,
          },
        }
      )

      if (error) {
        console.error('Error generating embedding:', error)
        throw error
      }

      return data || { success: false, embedding_generated: false, similar_pets: [] }
    } catch (error) {
      console.error('Pet AI service error:', error)
      throw error
    }
  }

  async findSimilarPets(
    embedding: number[],
    threshold: number = 0.75,
    limit: number = 10,
    excludePetId?: string
  ): Promise<SimilarPet[]> {
    try {
      const { data, error } = await this.supabase.rpc('find_similar_pets', {
        query_embedding: embedding,
        similarity_threshold: threshold,
        limit_count: limit,
        exclude_pet_id: excludePetId || null,
      })

      if (error) {
        console.error('Error finding similar pets:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Similar pets search error:', error)
      throw error
    }
  }

  // Convert image file to base64 for processing
  async imageFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix to get raw base64
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Generate a heat map of likely search areas based on breed and behavior
  async generatePredictiveHeatMap(
    petBreed: string,
    petBehavior: string[],
    lastLocation: { lat: number; lng: number },
    terrain: 'coastal' | 'urban' | 'rural' | 'mixed' = 'mixed'
  ): Promise<{ lat: number; lng: number; probability: number }[]> {
    // Mock predictive search based on breed and terrain
    const heatPoints: { lat: number; lng: number; probability: number }[] = []
    
    // Dogs typically travel 1-3 miles per day when lost
    // Cats typically stay within 0.5 miles of home
    const isCat = petBreed.toLowerCase().includes('cat')
    const maxDistance = isCat ? 0.5 : 3
    
    // Generate heat points in expanding circles
    for (let radius = 0.5; radius <= maxDistance; radius += 0.5) {
      const numPoints = Math.ceil(radius * 8) // More points as radius increases
      
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI
        
        // Adjust probability based on terrain and behavior
        let probability = 1 - (radius / maxDistance)
        
        if (terrain === 'coastal' && petBehavior.includes('water-loving')) {
          probability *= 1.5 // Higher probability near water
        }
        
        if (terrain === 'urban' && petBehavior.includes('skittish')) {
          probability *= 0.7 // Less likely in busy areas
        }
        
        heatPoints.push({
          lat: lastLocation.lat + (radius * Math.cos(angle)) / 69, // Approximate miles to degrees
          lng: lastLocation.lng + (radius * Math.sin(angle)) / (69 * Math.cos(lastLocation.lat * Math.PI / 180)),
          probability: Math.min(probability, 1)
        })
      }
    }
    
    return heatPoints.sort((a, b) => b.probability - a.probability)
  }
}

export const petAIService = new PetAIService()
