import React, { useState } from 'react';
import { AppState } from '../App';

interface ControlsProps {
  config: AppState;
  onConfigChange: (key: keyof AppState, value: any) => void;
}

const Controls: React.FC<ControlsProps> = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');
      
      onConfigChange('backgroundUrl', url);
      onConfigChange('isVideo', isVideo);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-8 right-8 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/80 transition-all duration-300 hover:scale-110 hover:text-white hover:bg-white/10 backdrop-blur-md z-50 ${isOpen ? 'opacity-100 bg-white/10' : 'opacity-50 bg-white/5'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
      </button>

      {/* Panel */}
      <div 
        className={`fixed bottom-24 right-8 w-72 bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/15 rounded-2xl p-6 text-white transform transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] z-40 ${
          isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-4">
          
          <ControlGroup label="Rain Amount (雨量)">
            <input 
              type="range" min="0" max="1.5" step="0.01" 
              value={config.rainAmount}
              onChange={(e) => onConfigChange('rainAmount', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
            />
          </ControlGroup>

          <ControlGroup label="Rain Speed (雨速)">
            <input 
              type="range" min="0.1" max="3.0" step="0.1" 
              value={config.speed}
              onChange={(e) => onConfigChange('speed', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
            />
          </ControlGroup>

          <ControlGroup label="Drop Size (雨珠大小)">
            <input 
              type="range" min="0.5" max="2.5" step="0.01" 
              value={config.size}
              onChange={(e) => onConfigChange('size', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
            />
          </ControlGroup>

          <ControlGroup label="Fog Density (雾气)">
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={config.fog}
              onChange={(e) => onConfigChange('fog', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
            />
          </ControlGroup>

          <ControlGroup label="Refraction (折射强度)">
            <input 
              type="range" min="0" max="2" step="0.1" 
              value={config.refraction}
              onChange={(e) => onConfigChange('refraction', parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-200 transition-all"
            />
          </ControlGroup>

          <div className="pt-2">
            <label className="flex flex-col items-center justify-center w-full h-10 border border-dashed border-white/30 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
              <span className="text-xs text-white/70 group-hover:text-white tracking-wider text-center">
                更换背景 (图片/视频)
              </span>
              <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </label>
          </div>

        </div>
      </div>
    </>
  );
};

const ControlGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-2 font-medium">
      {label}
    </label>
    {children}
  </div>
);

export default Controls;