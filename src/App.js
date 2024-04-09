import React, { useState, useEffect } from 'react';
import Autosuggest from 'react-autosuggest';
import haversine from 'haversine-distance';
import Papa from 'papaparse'; // Import PapaParse library for parsing CSV
import Plot from 'react-plotly.js';
import IcicleChart from './Icicle';

const TARGET_COUNTRY = { name: 'France', lat: 46.603354, lon: 1.888334 }; // Example target country

function App() {
  const [guess, setGuess] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [distanceAway, setDistanceAway] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countryMap, setCountryMap] = useState([])
  const [emissionData, setEmissionData] = useState([])
  const [countryLocation, setCountryLocation] = useState([])
  const [data, setData] = useState([]);
  const [elecData, setElecData] = useState([])  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [sankeyData, setSankeyData] = useState({});
  const [elecChartData, setElecChartData] = useState({})

  useState(() => {
    fetch('/electricity_source.csv')
      .then(response => response.text())
      .then(text => {
        const result = Papa.parse(text, { header: true }).data;
        setElecData(result)
      })
      .catch(error => console.error(error));
  }, []);


  useEffect(() => {
    const elecFiltered = elecData.filter(entry => entry.Year === '2021' && entry.Entity === selectedCountry);
    const x_data = []
    const y_data = []
    elecFiltered.forEach(entry => {
      x_data.push('Gas', 'Coal', 'BioEnergy', 'Hydropower', 'Nuclear', 'Oil', 'Other Renewables', 'Solar')
      y_data.push(entry.gas, entry.coal, entry.bioenergy, entry.hydro, entry.nuclear, entry.oil, entry.other_renewables, entry.solar)
    })

    setElecChartData({
      data: [{
        x: x_data,
        y: y_data,
        type: 'bar'
      }],
  })

  }, [elecData, selectedCountry]);

  useState(() => {
    fetch('/country_csv.csv')
      .then(response => response.text())
      .then(text => {
        const result = Papa.parse(text, { header: true });
        
        const countryList = result.data.map(row => row.Country);
        setCountries(countryList)
        setCountryLocation(result.data)
      })
      .catch(error => console.error(error));
  }, []);
  
  useEffect(() => {
    // Filter data based on selected country
    const countryData = data.filter(entry => entry.Country === selectedCountry);

    // Prepare data for the Sankey diagram
    const nodes = [];
    const links = [];

    countryData.forEach(entry => {
      if (!nodes.includes(entry.Sector)) {
        nodes.push(entry.Sector);
      }
      if (!nodes.includes(entry.Substance)) {
        nodes.push(entry.Substance);
      }

      const source = nodes.indexOf(entry.Substance);
      const target = nodes.indexOf(entry.Sector);
      links.push({
        source,
        target,
        value: entry.val
      });
    });

    setSankeyData({
      data: [{
        type: 'sankey',
        orientation: 'h',
        node: {
          pad: 15,
          thickness: 30,
          line: {
            color: 'black',
            width: 0.5
          },
          label: nodes
        },
        link: {
          source: links.map(link => link.source),
          target: links.map(link => link.target),
          value: links.map(link => link.value)
        }
      }]
    });
  }, [data, selectedCountry]);

  const handleCountryChange = (event) => {
    setSelectedCountry(event.target.value);
  };

  useState(() => {
    fetch('/Emission_Data.csv')
      .then(response => response.text())
      .then(text => {
        const result = Papa.parse(text, { header: true }).data;
        setEmissionData(result)
        setData(result)
      })
      .catch(error => console.error(error));
  }, []);


  const handleGuess = (event, { newValue }) => {
    setGuess(newValue);
    setDistanceAway(null);
  };

  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;
    return inputLength === 0 ? [] : countries.filter(country =>
      country.toLowerCase().slice(0, inputLength) === inputValue
    );
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion) => suggestion;

  const renderSuggestion = (suggestion) => (
    <div>
      {suggestion}
    </div>
  );

  const inputProps = {
    placeholder: 'Enter a country name',
    value: guess,
    onChange: handleGuess
  };

  const handleGuessSubmit = () => {
    const index = countries.indexOf(guess);
    console.log(guess)
    if (index === -1) {
      setDistanceAway(null); // Reset distance if the country is not found in the list
      return;
    }

    const country_loc = countryLocation.filter(entry => entry.Country === guess);
    const chosen_country = countryLocation.filter(entry => entry.Country === TARGET_COUNTRY.name)

    // Calculate distance between guess and target country
    const distance = haversine(
      { latitude: chosen_country[0].lat, longitude: chosen_country[0].lon },
      { latitude: country_loc[0].lat, longitude: country_loc[0].lon }
    );

    // Set distance away
    setDistanceAway(distance);
  };

  return (
    <div className="App">
      <h1>Country Wordle</h1>
      <div>
        <div style={{'display': 'flex'}}> 
      <Plot
        data={sankeyData.data}
        layout={{ width: '50%', height: 500, title: `Emissions Sankey Diagram` }}
      />
      
        <Plot
        data={elecChartData.data}
        layout={{ width: '50%', height: 500, title: `Electricity Production by Source`, xaxis: { title: 'Source' }, yaxis: { title: 'TWh' }}}
      />
      </div>
      <select onChange={handleCountryChange}>
        <option value="United States">Select a country</option>
        {/* Populate dropdown with unique countries from data */}
        {Array.from(new Set(data.map(entry => entry.Country))).map(country => (
          <option key={country} value={country}>{country}</option>
        ))}
      </select>


    </div>
      <p>Guess the country!</p>
      <Autosuggest
        suggestions={suggestions}
        onSuggestionsFetchRequested={onSuggestionsFetchRequested}
        onSuggestionsClearRequested={onSuggestionsClearRequested}
        getSuggestionValue={getSuggestionValue}
        renderSuggestion={renderSuggestion}
        inputProps={inputProps}
      />
      <button onClick={handleGuessSubmit}>Guess</button>
      {distanceAway !== null  && (
        <p>Distance away: {distanceAway.toFixed(2)} km</p>
      )}
      
    </div>
  );
}

export default App;
