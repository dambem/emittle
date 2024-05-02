
import { AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogOverlay, Box, Button, ChakraProvider, Tab, TabList, TabPanel, TabPanels, Tabs, useDisclosure } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';

import { AlertDialogCloseButton, AlertDialogHeader, Card, Center, Heading, Highlight, Text, useColorModeValue } from '@chakra-ui/react';
import haversine from 'haversine-distance';
import Papa from 'papaparse'; // Import PapaParse library for parsing CSV
import Autosuggest from 'react-autosuggest';
import ConfettiExplosion from 'react-confetti-explosion';
import ReactCountryFlag from "react-country-flag";
import Plot from 'react-plotly.js';
import { useSpring } from 'react-spring';
import Footer from './Footer';


function App() {
  const [guess, setGuess] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure()
  const cancelRef = React.useRef()

  const [suggestions, setSuggestions] = useState([]);
  const [distanceAway, setDistanceAway] = useState(null);
  const [countries, setCountries] = useState([]);
  const [countryMap, setCountryMap] = useState([])
  const [countryLocation, setCountryLocation] = useState([])
  const [data, setData] = useState([]);
  const [elecData, setElecData] = useState([])
  const [sankeyData, setSankeyData] = useState({});
  const [elecChartData, setElecChartData] = useState({})
  const [guesses, setGuesses] = useState(Array(5).fill(null));
  const [gameOver, setGameOver] = useState(0);
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

  function bearing(startLat, startLng, destLat, destLng) {
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
    return (bearings[index]);

  }

    useEffect(() => {
      fetchData();
  }, []);
  const fetchData = async () => {
    try {
        const [elecResponse, countryResponse, emissionResponse] = await Promise.all([
            fetch('/electricitysource.csv').then(response => response.text()),
            fetch('/country_csv.csv').then(response => response.text()),
            fetch('/Emission_Data.csv').then(response => response.text())
        ]);
        const [elecData, countryData, emissionData] = await Promise.all([
            setElecData(Papa.parse(elecResponse, { header: true }).data),
            Papa.parse(countryResponse, { header: true }).data,
            setData(Papa.parse(emissionResponse, { header: true }).data)
        ]);
        // Process fetched data
    } catch (error) {
        console.error('Error fetching data: ', error);
    }
};
  useEffect(() => {
    if (selectedCountry != null) {
      const elecFiltered = elecData.filter(entry => entry.Year === '2021' && entry.EDGAR === selectedCountry.EDGAR);
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
            color: 'orange',
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
        var day = getDayOfYear()
        if (day > result.data.length) {
          day = day - result.data.length
        }
        setCountries(result.data)
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

  const handleGuess = (event, { newValue }) => {
    setGuess(newValue);
    setDistanceAway(null);
  };

  const getSuggestions = (value) => {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;
    return inputLength === 0 ? [] : countries.filter(country =>
      country.Country.toLowerCase().slice(0, inputLength) === inputValue
    ).slice(0, 3);
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const getSuggestionValue = (suggestion) => {
    return suggestion.Country};

  const renderSuggestion = (suggestion) => (
    <span>
      {suggestion.Country} <ReactCountryFlag countryCode={suggestion.TWO} svg />           
    </span>
  );

  const inputProps = {
    placeholder: 'Enter a country name',
    value: guess,
    onChange: handleGuess
  };

  const handleGuessSubmit = () => {
    const country = countries.filter(entry => entry.Country === guess)[0];
    // console.log(selectedCountry.lat)

    const distance = haversine(
      { latitude: selectedCountry.lat, longitude: selectedCountry.lon },
      { latitude: country.lat, longitude: country.lon }
    ) / 1000;

    const newGuesses = [...guesses];
    const index2 = newGuesses.findIndex((g) => g === null);
    var degree = bearing(country.lat, country.lon, selectedCountry.lat, selectedCountry.lon)
    newGuesses[index2] = [guess, distance, degree, country.TWO]

    if (guess == selectedCountry.Country) {
      setGameOver(1)
      onOpen()
    } else if (newGuesses.every((g) => g !== null)) {
      setMessage("The Country was " + selectedCountry.Country)
      setGameOver(2)
      onOpen()
    }
    // Calculate distance between guess and target country
    // + " Find out more about them" + <a href='https://www.eia.gov/international/analysis/country/{{selectedCountry.EDGAR}}' > here </a>
    setGuesses(newGuesses);
    setDistanceAway(distance);
  };

  return (
    <ChakraProvider>
      <Box className="App" bg={useColorModeValue('gray.100', 'gray.700')}>
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
        </Center>

        <AlertDialog
        motionPreset='slideInBottom'
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isOpen={isOpen}
        isCentered
        >
        <AlertDialogOverlay />
        <AlertDialogContent>
          <AlertDialogHeader>
          {gameOver == 1 ? 
            <>Winner! </> :
            <>Loser :(</> 
          }
          </AlertDialogHeader>
          <AlertDialogCloseButton />
          <AlertDialogBody>
          {gameOver == 1 ? 
          <div><ConfettiExplosion /><Highlight query='won' styles={{ px: '2', py: '1', rounded: 'full', bg: 'green.100' }}>Congratulations, you won! </Highlight><ConfettiExplosion /></div>
          : 
          <div> <Highlight query='lost' styles={{ px: '2', py: '1', rounded: 'full', bg: 'red.100' }}>Sorry, you lost! </Highlight> </div>
          }
          
          {selectedCountry ? <div> More Information On {selectedCountry.Country} <a href={'https://www.eia.gov/international/analysis/country/'+selectedCountry.EDGAR}> here </a> </div>
           : null }
          </AlertDialogBody>
          <AlertDialogFooter>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>

        <br></br>
        <Center>
      <Tabs variant='soft-rounded' colorScheme='green'>
        <TabList>
          <Tab>Electricity Production</Tab>
          <Tab>Emission Sources</Tab>
        </TabList>
        <TabPanels>

          <TabPanel>
            <Card>
              <Plot
                config={{ displayModeBar: false, responsive: true}}
                data={elecChartData.data}
                layout={{
                  width: '100%',
                  height: '300px',
                  margin: {
                    l: 150,
                  },
                  title: `Electricity Production by Source (TWh)`,
                }}
              />
            </Card>
          </TabPanel>

          <TabPanel>
            <Card>
              <Plot
                config={{ displayModeBar: false, responsive: true}}
                data={sankeyData.data}
                layout={{ width: '100%', height: '100%', title: `Emission Sources` }}
              />
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>

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
            style={{'height':'100%'}}
          />
          <Button style={{ 'marginLeft': '0.5%' }} colorScheme='orange' variant='outline' onClick={handleGuessSubmit}>Guess</Button>

        </Center>
        <Center >
          <ul >
            {guesses.map((guess, index) => {
              if (guess != null) {
                return (
                  <Card style={{
                    width: '25em',
                    height: '30px',
                    border: '1px solid black',
                    margin: '5px',
                    textAlign: 'center',
                    margin: '10px',
                    backgroundColor: 'white',
                    // padding: '10px'

                  }} key={index}><Text size={'lg'}>{guess[0]} <ReactCountryFlag countryCode={guess[3]} svg /> | <b>{guess[1].toFixed(0)}km  | {guess[2]} </b>  </Text>    </Card>
                )
              } else {
                return (
                  <Card
                    key={index}
                    style={{
                      width: '25em',
                      height: '30px',
                      border: '1px dashed gray',
                      margin: '10px',
                      paddingBottom: '5px',
                      backgroundColor: 'white',


                    }}
                  ></Card>
                )
              }
            })}
          </ul>
        </Center>
        <Center>
        </Center>
        <br />
        <Footer />

      </Box>


    </ChakraProvider>
  );
}

export default App;
