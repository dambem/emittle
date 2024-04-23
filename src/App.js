
import React, { useState, useEffect } from 'react';
import { ChakraProvider } from '@chakra-ui/react'
import { Button, ButtonGroup } from '@chakra-ui/react'
import { Container, Box } from '@chakra-ui/react'
import { Center, Square, Circle, Card } from '@chakra-ui/react'
import { Heading, Highlight, Text, useColorModeValue } from '@chakra-ui/react'
import Arrow from './Arrow'
import Autosuggest from 'react-autosuggest';
import haversine from 'haversine-distance';
import Papa from 'papaparse'; // Import PapaParse library for parsing CSV
import Plot from 'react-plotly.js';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { useSpring, animated } from 'react-spring';
import Footer from './Footer'

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
  const [sankeyData, setSankeyData] = useState({});
  const [elecChartData, setElecChartData] = useState({})
  const [guesses, setGuesses] = useState(Array(5).fill(null));
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);

// Converts from degrees to radians.
  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  };
  function getDayOfYear() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }
  // Converts from radians to degrees.
  function toDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  function bearing(startLat, startLng, destLat, destLng){
    startLat = toRadians(startLat);
    startLng = toRadians(startLng);
    destLat = toRadians(destLat);
    destLng = toRadians(destLng);
  
    const y = Math.sin(destLng - startLng) * Math.cos(destLat);
    const x = Math.cos(startLat) * Math.sin(destLat) -
          Math.sin(startLat) * Math.cos(destLat) * Math.cos(destLng - startLng);
    const brng = (toDegrees(Math.atan2(y, x)) + 360) % 360;
    var bearings = ["NE", "E", "SE", "S", "SW", "W", "NW", "N"];

    var index = brng - 22.5;
    if (index < 0)
        index += 360;
    index = parseInt(index / 45);
    return(bearings[index]);

  }
  const revealAnimation = useSpring({
    opacity: 1,
    from: { opacity: 0 },
    delay: 500,
  });



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
    if (selectedCountry != null) {
    const elecFiltered = elecData.filter(entry => entry.Year === '2021' && entry.EDGAR === selectedCountry.EDGAR);
    // console.log(selectedCountry)
    const x_data = []
    const y_data = []
    elecFiltered.forEach(entry => {
      x_data.push('Gas', 'Coal', 'BioEnergy', 'Hydropower', 'Nuclear', 'Oil', 'Other Renewables', 'Solar', 'Wind')
      y_data.push(entry.gas, entry.coal, entry.bioenergy, entry.hydro, entry.nuclear, entry.oil, entry.other_renewables, entry.solar, entry.wind)
    })

    setElecChartData({
      data: [{
        x: y_data,
        y: x_data,
        type: 'bar',
        orientation: 'h',
        marker: {
          color: 'rgba(55,128,191,0.6)',
          width: 1
        },
      }],
    })
  }
  }, [elecData, selectedCountry]);

  useState(() => {
    fetch('/country_csv.csv')
      .then(response => response.text())
      .then(text => {
        const result = Papa.parse(text, { header: true });
        var num = Math.floor(Math.random() * result.data.length);
        var day = getDayOfYear()
        if (day > result.data.length) {
          day = day - result.data.length
        }
        // console.log(num)
        const countryList = result.data.map(row => row.Country);
        console.log(result.data[day])
        setCountries(countryList)
        setCountryLocation(result.data)
        setSelectedCountry(result.data[day])
        

      })
      .catch(error => console.error(error));
  }, []);

  useEffect(() => {
    // Filter data based on selected country
    const countryData = data.filter(entry => entry.EDGAR === selectedCountry.EDGAR);

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
    <span>
      {suggestion}
    </span>
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
    // console.log(selectedCountry.lat)

    const distance = haversine(
      { latitude: selectedCountry.lat, longitude: selectedCountry.lon },
      { latitude: country_loc[0].lat, longitude: country_loc[0].lon }
    )/1000;

    const newGuesses = [...guesses];
    const index2 = newGuesses.findIndex((g) => g === null);
    var degree = bearing(country_loc[0].lat, country_loc[0].lon, selectedCountry.lat, selectedCountry.lon)
    newGuesses[index2] = [guess, distance, degree]
    console.log(guess)
    console.log(selectedCountry)

    if (guess == selectedCountry.Country) {
      setMessage( <Highlight query='won'  styles={{ px: '2', py: '1', rounded: 'full', bg: 'green.100' }}>Congratulations, you won!</Highlight>)
      setGameOver(true)
    } else if (newGuesses.every((g) => g !== null)) {
      setMessage("The Country was " +  selectedCountry.Country )
      setGameOver(true)
    }
    // Calculate distance between guess and target country
    // + " Find out more about them" + <a href='https://www.eia.gov/international/analysis/country/{{selectedCountry.EDGAR}}' > here </a>
    setGuesses(newGuesses);
    // Set distance away
    setDistanceAway(distance);
  };

  return (
    <ChakraProvider>

    <Box className="App" bg={useColorModeValue('gray.100', 'gray.700')}>
      <br></br>
      <Center>


      <Heading
          fontWeight={600}
          fontSize={{ base: '3xl', sm: '4xl', md: '6xl' }}
          lineHeight={'110%'}>
          <Text as={'span'} color={'orange.400'}>
            Emittle
          </Text>
        </Heading>
      {/* <Heading>Emittle</Heading> */}
      </Center>
      <Center>
      <Text fontSize="lg" color={'gray.500'}>
      Guess the country based on the emission data
      </Text>
      <br></br>

      </Center>
      <Center>
      <Autosuggest
          suggestions={suggestions}
          onSuggestionsFetchRequested={onSuggestionsFetchRequested}
          onSuggestionsClearRequested={onSuggestionsClearRequested}
          getSuggestionValue={getSuggestionValue}
          renderSuggestion={renderSuggestion}
          inputProps={inputProps}
          highlightFirstSuggestion={true}

        />
      <Button isLoading={gameOver} style={{ 'marginLeft': '0.5%'}} colorScheme='teal' onClick={handleGuessSubmit}>Guess</Button>

      </Center>
      <br></br>
      <Center>
        <div style={{ 'display': 'flex' }}>
          <Card>

            <Plot
              config={{displayModeBar:false}}
              data={sankeyData.data}
              layout={{ width: '50%', height: '5%', title: `Emissions Sankey Diagram` }}
            />
          </Card>
          <Card>

          <Plot
            config={{displayModeBar:false}}
            data={elecChartData.data}
            layout={{ width: '50%', height: '5%',         margin: {
              l: 150,  
            }, title: `Electricity Production by Source (TWh)`}}
          />
          </Card>
        </div>



      </Center>
      <Center><Heading>{message}</Heading></Center>
      <br></br>
      <Center >
      <ul >
        {guesses.map((guess, index) => {
          if (guess != null ){
            return (
            <animated.div             style={{
              width: '20em',
              height: '25px',
              border: '1px solid black',
              margin: '5px',
              textAlign: 'center',
              margin: '10px',
              paddingBottom: '1%',
              backgroundColor: 'white',
              ...revealAnimation
              // padding: '10px'

            }} key={index}><Text size={'lg'}>{guess[0]}  <b>{guess[1].toFixed(0)}km      {guess[2]} </b>  </Text>      </animated.div>
            )
          } else { 
            return(
       <animated.div
            key={index}
            style={{
              width: '20em',
              height: '25px',
              border: '1px dashed gray',
              margin: '10px',
              paddingBottom: '5px',
              backgroundColor: 'white',
              ...revealAnimation

            }}
          ></animated.div>
)     
          }
        })}
      </ul>
      </Center>
      <Center>


      {/* {distanceAway !== null && (
        <p>Distance away: {distanceAway.toFixed(2)} km</p>
      )} */}
      </Center>
      <br/>
      <Footer/>

    </Box>


    </ChakraProvider>
  );
}

export default App;
