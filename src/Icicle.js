import React, { useEffect } from 'react';
import Plot from 'react-plotly.js';

const IcicleChart = ({ data }) => {
    // Group the data by Substance and Sector
    const groupedData = data.reduce((acc, obj) => {
        const key = `${obj.Substance}-${obj.Sector}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(obj['val']);
        return acc;
    }, {});
    
  useEffect(() => {
    if (!data || data.length === 0) return;
    console.log(data)


  }, [data]);
    const plotData = Object.keys(groupedData).map(country => ({
        type: 'bar',
        name: country,
        y: groupedData[country],
        boxpoints: 'all',
        jitter: 0.3,
        pointpos: -1.8,
        marker: { size: 4 },
        line: { width: 1 }
      }));
    
    // Define layout
    const layout = {
        title: 'Box Plot of Values by Country',
        yaxis: { title: 'Value' }
    };
  return  <Plot data={plotData} layout={layout}/>;
};

export default IcicleChart;
