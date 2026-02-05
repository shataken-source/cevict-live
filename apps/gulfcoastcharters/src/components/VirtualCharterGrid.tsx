import { FixedSizeGrid as Grid } from 'react-window';
import { useEffect, useState } from 'react';
import CharterCard from './CharterCard';

interface Charter {
  id: string;
  name: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  capacity: number;
}

interface VirtualCharterGridProps {
  charters: Charter[];
  onCharterClick: (charter: Charter) => void;
}

export default function VirtualCharterGrid({ charters, onCharterClick }: VirtualCharterGridProps) {
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth - 48,
        height: window.innerHeight - 200,
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const columnCount = Math.floor(dimensions.width / 350);
  const rowCount = Math.ceil(charters.length / columnCount);
  const columnWidth = Math.floor(dimensions.width / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= charters.length) return null;
    const charter = charters[index];

    return (
      <div style={{ ...style, padding: '12px' }}>
        <CharterCard charter={charter} onClick={() => onCharterClick(charter)} />
      </div>
    );
  };

  return (
    <Grid
      columnCount={columnCount}
      columnWidth={columnWidth}
      height={dimensions.height}
      rowCount={rowCount}
      rowHeight={420}
      width={dimensions.width}
    >
      {Cell}
    </Grid>
  );
}
