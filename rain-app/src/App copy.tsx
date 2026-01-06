import React, { useState } from 'react';
import RainSimulation from './components/RainSimulation';
import Controls from './components/Controls';

export interface AppState {
  rainAmount: number;
  speed: number;
  size: number;
  fog: number;
  refraction: number;
  backgroundUrl: string | null;
  isVideo: boolean;
}

const App: React.FC = () => {
  const [config, setConfig] = useState<AppState>({
    rainAmount: 0.8,
    speed: 1.0,
    size: 1.0,
    fog: 0.5,
    refraction: 1.2,
    backgroundUrl: null,
    isVideo: false,
  });

  const handleConfigChange = (key: keyof AppState, value: number | string | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="relative w-full h-screen bg-black">
      <RainSimulation config={config} />
      <Controls config={config} onConfigChange={handleConfigChange} />
    </div>
  );
};

export default App;