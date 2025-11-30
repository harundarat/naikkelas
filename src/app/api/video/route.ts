import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const VIDEO_PROVIDER = process.env.VIDEO_PROVIDER || 'gemini'; // Switch between 'gemini' and 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_API_KEY',
});

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'YOUR_API_KEY' });

export async function POST(req: Request) {
  try {
    const { message, image, isTemporary } = await req.json();

    console.log('Received video generation request:', {
      message,
      image: image ? image.substring(0, 50) + '...' : 'No image attached',
      isTemporary,
    });

    const prompt = message || 'A beautiful cinematic shot.';
    let videoBuffer: Buffer | undefined; // Use a buffer to hold video content temporarily

    if (VIDEO_PROVIDER === 'openai') {
      const durationMatch = prompt.match(/(\d+)\s*s(ec|econds)?/);
      const duration = durationMatch ? parseInt(durationMatch[1], 10) : undefined;

      const apiPayload: OpenAI.VideoCreateParams = {
        model: "sora-2",
        prompt,
        size: "1280x720",
        seconds: duration,
      };

      if (image) {
        const base64Data = image.split(',')[1];
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const inputFile = await toFile(imageBuffer, 'input.png', { type: 'image/png' });
        apiPayload.input_reference = inputFile;
      }

      try {
        console.log("Calling OpenAI API to create video job...");
        const initialResponse = await openai.videos.create(apiPayload);
        const videoId = initialResponse.id;
        console.log(`Video job created with ID: ${videoId}. Starting to poll for completion...`);

        let video = initialResponse;
        while (video.status === 'queued' || video.status === 'in_progress') {
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log(`Polling for video ID: ${videoId}...`);
          video = await openai.videos.retrieve(videoId);
          console.log(`Current video status: ${video.status}`);
        }

        if (video.status === 'completed') {
          console.log('Video successfully completed. Downloading content...');
          const content = await openai.videos.downloadContent(video.id);
          videoBuffer = Buffer.from(await content.arrayBuffer());
          console.log("Successfully retrieved OpenAI video content.");
        } else {
          console.error('Video creation failed. Status:', video.status, 'Error:', video.error);
          throw new Error(`Video generation failed with status: ${video.status}`);
        }
      } catch (apiError) {
        console.error("!!! OpenAI API Error:", apiError);
        throw apiError;
      }
    } else if (VIDEO_PROVIDER === 'gemini') {
      try {
        console.log("Calling Gemini API to generate video...");

        const apiPayload: any = {
          model: "veo-3.1-generate-preview",
          prompt: prompt,
        };

        if (image) {
          apiPayload.image = {
            imageBytes: Buffer.from(image.split(',')[1], 'base64').toString('base64'),
            mimeType: "image/png",
          };
        }

        let operation = await genAI.models.generateVideos(apiPayload);

        while (!operation.done) {
          console.log("Waiting for video generation to complete...");
          await new Promise((resolve) => setTimeout(resolve, 10000));
          // Refresh the operation object to get the latest status.
          operation = await genAI.operations.getVideosOperation({ operation });
        }

        if (operation.error) {
          throw new Error(operation.error.message || 'Video generation failed');
        }

        if (operation.response && operation.response.generatedVideos && operation.response.generatedVideos.length > 0) {
          const generatedVideo = operation.response.generatedVideos[0];
          const videoUri = generatedVideo.video.uri;
          const fileName = videoUri.split('/files/')[1].split(':')[0];
          const resourceName = `files/${fileName}`;

          console.log(`Attempting to download video from URI: ${videoUri} with resource name: ${resourceName}`);

          const MAX_RETRIES = 3;
          for (let i = 0; i < MAX_RETRIES; i++) {
            try {
              const content = await genAI.files.download({ file: resourceName });
              if (content && content.arrayBuffer) {
                videoBuffer = Buffer.from(await content.arrayBuffer());
                console.log(`Successfully retrieved Gemini video content on attempt ${i + 1}.`);
                break; // Exit loop on success
              }
              console.warn(`Attempt ${i + 1} failed: Video content was empty. Retrying in 5 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (downloadError) {
              console.warn(`Attempt ${i + 1} failed with error:`, downloadError);
              if (i < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
              } else {
                throw new Error(`Failed to download video content for resource "${resourceName}" after ${MAX_RETRIES} attempts.`);
              }
            }
          }

          if (!videoBuffer) {
            throw new Error(`Failed to download video content for resource "${resourceName}" after ${MAX_RETRIES} attempts. The response was consistently empty.`);
          }

        } else {
          const reason = (operation.response && operation.response.raiMediaFilteredReasons?.[0]) || "Video generation failed for an unknown reason.";
          throw new Error(reason);
        }

      } catch (apiError: any) {
        console.error("!!! Gemini API Error:", apiError.message || apiError);
        throw apiError;
      }
    }

    let videoUrl;
    if (videoBuffer) {
      if (isTemporary) {
         videoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
         console.log(`Temporary chat: Returning video as base64 data URI.`);
      } else {
        try {
          const supabase = await createServerSupabaseClient();
          const fileName = `video-${Date.now()}-${Math.random().toString(36).substring(7)}.mp4`;
          
          console.log(`Uploading video to Supabase Storage as ${fileName}...`);
          
          const { error: uploadError } = await supabase
            .storage
            .from('chat-media')
            .upload(fileName, videoBuffer, {
              contentType: 'video/mp4',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          const { data: { publicUrl } } = supabase
            .storage
            .from('chat-media')
            .getPublicUrl(fileName);
            
          videoUrl = publicUrl;
          console.log(`Video uploaded successfully. Public URL: ${videoUrl}`);
        } catch (uploadError) {
          console.error("Failed to upload video to Supabase Storage:", uploadError);
          // Fallback to base64 if upload fails, to avoid breaking the user experience completely
          videoUrl = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
          console.warn("Falling back to base64 response.");
        }
      }
    }

    return NextResponse.json({ reply: 'Here is your generated video:', videoUrl });

  } catch (error) {
    console.error('Error in video generation route:', error);
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}