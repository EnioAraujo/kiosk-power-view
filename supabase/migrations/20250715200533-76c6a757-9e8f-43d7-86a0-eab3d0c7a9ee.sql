-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('presentation-images', 'presentation-images', true);

-- Create policies for presentation images
CREATE POLICY "Anyone can view presentation images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'presentation-images');

CREATE POLICY "Anyone can upload presentation images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'presentation-images');

CREATE POLICY "Anyone can update presentation images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'presentation-images');

CREATE POLICY "Anyone can delete presentation images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'presentation-images');