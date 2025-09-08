import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generatePosterImage, POSTER_PROMPT } from './services/geminiService';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-3.181-4.991-3.181-3.183a8.25 8.25 0 0 0-11.667 0L2.985 9.644Z" />
    </svg>
);

const FILTERS = [
    { name: 'None', value: 'none' },
    { name: 'Vintage', value: 'sepia(0.6) contrast(1.1) brightness(0.9) saturate(1.2)' },
    { name: 'Grayscale', value: 'grayscale(1)' },
    { name: 'High Contrast', value: 'contrast(1.5)' },
];

const LOADING_MESSAGES = [
    "Tuning the guitars...",
    "Soundchecking the mics...",
    "Setting up the pyrotechnics...",
    "Printing the setlists...",
    "The crowd is chanting your name...",
    "Building the main stage...",
    "The headliner is on their way...",
];

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>(POSTER_PROMPT);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);

  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [activeFilter, setActiveFilter] = useState('none');

  useEffect(() => {
    let intervalId: number | undefined;

    if (loading) {
      let messageIndex = 0;
      setLoadingMessage(LOADING_MESSAGES[0]);
      
      intervalId = window.setInterval(() => {
        messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
        setLoadingMessage(LOADING_MESSAGES[messageIndex]);
      }, 2500);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loading]);

  const resetEditingState = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setActiveFilter('none');
    
    // Reset crop on the image itself if it's visible
    if (imgRef.current) {
        const { width, height } = imgRef.current;
        const initialCrop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 90 },
                1.2 / 0.8,
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);
        setCompletedCrop({
            unit: 'px',
            x: (initialCrop.x / 100) * width,
            y: (initialCrop.y / 100) * height,
            width: (initialCrop.width / 100) * width,
            height: (initialCrop.height / 100) * height,
        });
    }
  };
  
  const handleGeneratePoster = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }
    setLoading(true);
    setError(null);
    setImageUrl(null);
    resetEditingState();
    try {
      const base64Image = await generatePosterImage(prompt);
      setImageUrl(`data:image/png;base64,${base64Image}`);
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
        makeAspectCrop(
            { unit: '%', width: 90 },
            1.2 / 0.8, // Aspect ratio 1.20m x 80cm
            width,
            height
        ),
        width,
        height
    );
    setCrop(initialCrop);

    // Set the initial completedCrop in pixels so the download works immediately
    const initialPixelCrop: PixelCrop = {
        unit: 'px',
        x: (initialCrop.x / 100) * width,
        y: (initialCrop.y / 100) * height,
        width: (initialCrop.width / 100) * width,
        height: (initialCrop.height / 100) * height,
    };
    setCompletedCrop(initialPixelCrop);
  }

  const handleDownloadCroppedImage = async () => {
    const image = imgRef.current;
    if (!image || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
        console.error("Download failed: Image not loaded or crop not set.");
        return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }
    
    ctx.filter = activeFilter;

    ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
    );

    const base64Image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = 'edited-backstage-poster.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-red-400 to-yellow-300 mb-2">
          Backstage Poster Generator
        </h1>
        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
          Using Gemini to visualize the gritty, authentic vibe of a rock festival's backstage schedule.
        </p>
        
        <div className="w-full mb-8 text-left">
            <label htmlFor="prompt-input" className="block text-lg font-medium text-gray-300 mb-2">
                Customize Your Poster Prompt
            </label>
            <textarea
                id="prompt-input"
                rows={15}
                className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg text-gray-200 focus:ring-red-500 focus:border-red-500 transition-colors disabled:opacity-70"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the poster you want to create..."
                disabled={loading}
                aria-label="Poster prompt input"
            />
        </div>

        {!imageUrl && !loading && (
          <div className="flex justify-center">
            <button
              onClick={handleGeneratePoster}
              disabled={loading}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gray-800 rounded-xl shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-6 h-6 mr-3 transition-transform duration-300 group-hover:rotate-12" />
              Generate Poster
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-800/50 rounded-lg shadow-xl">
            <svg className="animate-spin h-12 w-12 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p key={loadingMessage} className="mt-4 text-xl font-semibold animate-fade-in">
                {loadingMessage}
            </p>
            <p className="text-gray-400 mt-1">This can take a moment. The best things do.</p>
          </div>
        )}

        {error && (
          <div className="mt-8 p-4 bg-red-900/50 border border-red-700 text-red-300 rounded-lg shadow-lg">
            <h3 className="font-bold">Generation Failed</h3>
            <p>{error}</p>
          </div>
        )}

        {imageUrl && (
          <div className="mt-8 w-full flex flex-col items-center animate-fade-in">
            <div className="bg-black p-2 md:p-4 rounded-lg shadow-2xl shadow-red-500/20 border-2 border-gray-700">
                <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    aspect={1.2 / 0.8}
                    className="max-w-full h-auto"
                >
                    <img 
                        ref={imgRef}
                        src={imageUrl} 
                        alt="Generated backstage poster" 
                        className="rounded-md"
                        style={{ filter: activeFilter }}
                        onLoad={onImageLoad}
                    />
                </ReactCrop>
            </div>

            <div className="w-full max-w-2xl mt-6">
                <div className="text-lg font-medium text-gray-300 mb-3 text-center">Apply a Filter</div>
                <div className="flex flex-wrap justify-center gap-3">
                    {FILTERS.map(filter => (
                        <button
                            key={filter.name}
                            onClick={() => setActiveFilter(filter.value)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                                activeFilter === filter.value
                                ? 'bg-red-600 text-white shadow-md'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {filter.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <button
                onClick={handleGeneratePoster}
                disabled={loading}
                className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white transition-all duration-200 bg-gray-800 rounded-xl shadow-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SparklesIcon className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                Generate Another
              </button>
              <button
                onClick={resetEditingState}
                className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white transition-all duration-200 bg-gray-800 rounded-xl shadow-lg hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500"
              >
                <ResetIcon className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:rotate-[-90deg]" />
                Reset Edits
              </button>
              <button
                onClick={handleDownloadCroppedImage}
                className="group relative inline-flex items-center justify-center px-6 py-3 text-base font-bold text-white transition-all duration-200 bg-gray-800 rounded-xl shadow-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500"
              >
                <DownloadIcon className="w-5 h-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
                Download Poster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
