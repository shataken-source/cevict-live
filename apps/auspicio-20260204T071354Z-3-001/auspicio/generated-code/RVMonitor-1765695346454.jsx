import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const MonitorContainer = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  font-family: Arial, sans-serif;
`;

const MetricCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 15px;
  margin: 10px 0;
  backdrop-filter: blur(10px);
`;

function RVMonitor() {
  const [powerData, setPowerData] = useState({
    batteryVoltage: 12.6,
    solarInput: 150,
    acLoad: 200,
    batteryCurrent: -5.2
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time data
      setPowerData(prev => ({
        batteryVoltage: 11.8 + Math.random() * 1.2,
        solarInput: Math.max(0, 100 + Math.random() * 200),
        acLoad: 150 + Math.random() * 100,
        batteryCurrent: -Math.random() * 10
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MonitorContainer>
      <h1>RV Power Monitor</h1>
      <MetricCard>
        <h3>Battery Status</h3>
        <p>Voltage: {powerData.batteryVoltage.toFixed(1)}V</p>
        <p>Current: {Math.abs(powerData.batteryCurrent).toFixed(1)}A</p>
      </MetricCard>
      <MetricCard>
        <h3>Solar Input</h3>
        <p>Power: {powerData.solarInput.toFixed(0)}W</p>
      </MetricCard>
      <MetricCard>
        <h3>AC Load</h3>
        <p>Power: {powerData.acLoad.toFixed(0)}W</p>
      </MetricCard>
    </MonitorContainer>
  );
}

export default RVMonitor;