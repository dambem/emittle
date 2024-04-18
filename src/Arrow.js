import React from 'react';
import { ArrowForward } from '@mui/icons-material';

const Arrow = ({ degrees }) => {
    const arrowStyle = {
        transform: `rotate(${degrees}deg)`,
        transition: 'transform 0.3s ease-in-out', // Optional: Add smooth transition
        };
  return (
    <ArrowForward style={arrowStyle} />
  );
};

export default Arrow;