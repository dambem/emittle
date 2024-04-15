
import React, { useState, useEffect } from 'react';
import { ChakraProvider } from '@chakra-ui/react'
import { Button, ButtonGroup } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'
import { Center, Square, Circle } from '@chakra-ui/react'
import { Heading, Highlight } from '@chakra-ui/react'

import Autosuggest from 'react-autosuggest';
import haversine from 'haversine-distance';
import Papa from 'papaparse'; // Import PapaParse library for parsing CSV
import Plot from 'react-plotly.js';
import IcicleChart from './Icicle';
const TARGET_COUNTRY = { name: 'Iceland', lat: 46.603354, lon: 1.888334 }; // Example target country

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
  const [selectedCountry, setSelectedCountry] = useState('Iceland');
  const [sankeyData, setSankeyData] = useState({});
  const [elecChartData, setElecChartData] = useState({})
  const [guesses, setGuesses] = useState(Array(5).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');



  useState(() => {
    fetch('/electricitysource.csv')
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
      x_data.push('Gas', 'Coal', 'BioEnergy', 'Hydropower', 'Nuclear', 'Oil', 'Other Renewables', 'Solar', 'Wind')
      y_data.push(entry.gas, entry.coal, entry.bioenergy, entry.hydro, entry.nuclear, entry.oil, entry.other_renewables, entry.solar, entry.wind)
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
    ).slice(0, 3);
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
    const distance = haversine(
      { latitude: chosen_country[0].lat, longitude: chosen_country[0].lon },
      { latitude: country_loc[0].lat, longitude: country_loc[0].lon }
    )/1000;

    const newGuesses = [...guesses];
    const index2 = newGuesses.findIndex((g) => g === null);
    newGuesses[index2] = [guess, distance]

    if (guess == TARGET_COUNTRY.name) {
      setMessage( <Highlight query='won'  styles={{ px: '2', py: '1', rounded: 'full', bg: 'green.100' }}>Congratulations, you won!</Highlight>)
    } else if (newGuesses.every((g) => g !== null)) {
      setMessage("Boo, you lost :(")
    }
    // Calculate distance between guess and target country

    setGuesses(newGuesses);
    // Set distance away
    setDistanceAway(distance);
  };

  return (
    <ChakraProvider>

    <div className="App">
      <Center>
      <Heading>Emittle</Heading>
      </Center>
      <Center>
      <h2>Guess the country based on the emission data</h2>
      </Center>
      
      <Center>
        <div style={{ 'display': 'flex' }}>
          <Plot
            data={sankeyData.data}
            layout={{ width: '50%', height: '10%', title: `Emissions Sankey Diagram` }}
          />

          <Plot
            data={elecChartData.data}
            layout={{ width: '50%', height: '10%', title: `Electricity Production by Source`, xaxis: { title: 'Source' }, yaxis: { title: 'TWh' } }}
          />
        </div>

        <select onChange={handleCountryChange} style={{ 'display': 'none' }}>
          <option value="Iceland">Iceland</option>
          {/* Populate dropdown with unique countries from data */}
          {Array.from(new Set(data.map(entry => entry.Country))).map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>

      </Center>
      <Center><Heading>{message}</Heading></Center>
      <br></br>
      <Center>
      <ul>
        {guesses.map((guess, index) => {
          if (guess != null ){
            return (
            <div key={index}>{guess[0]}  {guess[1].toFixed(0)}km</div>
            )
          } else { 
            return(
       <div
            key={index}
            style={{
              width: '300px',
              height: '25px',
              border: '1px dashed gray',
              margin: '5px',
            }}
          ></div>
)
          }
        })}
      </ul>
      </Center>
      <Center>
        <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={onSuggestionsFetchRequested}
          onSuggestionsClearRequested={onSuggestionsClearRequested}
          getSuggestionValue={getSuggestionValue}
          renderSuggestion={renderSuggestion}
          inputProps={inputProps}
        />
      <Button onClick={handleGuessSubmit}>Guess</Button>
      {/* {distanceAway !== null && (
        <p>Distance away: {distanceAway.toFixed(2)} km</p>
      )} */}
      </Center>
    </div>
    </ChakraProvider>
  );
}

export default App;
