import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import { geocodeFilteredMatches } from "./utils/geocode.js";
import "leaflet/dist/leaflet.css";
import { blueIcon, redIcon, zoomIcon } from "./Icons.js";

const flyToOptions = {
  animate: true,
  duration: 1.5,
};

const MapComponent = ({ startDate, endDate }) => {
  const [isProcessing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [matches, setMatches] = useState([]);
  const [venueCoords, setVenueCoords] = useState({});
  const [cancelToken] = useState(axios.CancelToken.source());
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [distances, setDistances] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate Distances in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleMatchClick = (match) => {
    setSelectedMatch(match.id);

    if (mapInstance && venueCoords[match.id]) {
      const coords = venueCoords[match.id];
      mapInstance.flyTo(coords, 14, flyToOptions);
    }
  };

  useEffect(() => {
    return () => cancelToken.cancel("Компонента е демонтиран");
  }, []);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        () => setUserLocation([42.6977, 23.3219]) // Fallback to Sofia
      );
    } else {
      setUserLocation([42.6977, 23.3219]);
    }
  }, []);

  // Date filtering
  useEffect(() => {
    if (!startDate || !endDate) return;

    const cancelToken = axios.CancelToken.source();

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setMatches([]);
        setVenueCoords({});

        // Format dates in local timezone
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        };

        const dateFrom = formatDate(startDate);
        const dateTo = formatDate(endDate);

        // Fetch matches for specific date range
        const matchesResponse = await axios.get(`/api/matches`, {
          params: { dateFrom, dateTo },
          cancelToken: cancelToken.token,
        });

        if (!matchesResponse.data?.matches) {
          throw new Error("Invalid API response structure");
        }

        const filteredMatches = matchesResponse.data.matches;
        setMatches(filteredMatches);

        // Only process if there are matches
        if (filteredMatches?.length > 0) {
          const coords = await geocodeFilteredMatches(
            filteredMatches,
            cancelToken.token
          );

          setVenueCoords(coords);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Error fetching matches:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => cancelToken.cancel("Request canceled due to new search");
  }, [startDate, endDate]);

  // Calculate Distance between user and stadium
  useEffect(() => {
    if (!matches?.length || !userLocation) return;
    if (matches?.length > 0 && userLocation) {
      const newDistances = {};

      matches?.forEach((match) => {
        if (venueCoords[match.id]) {
          const [lat, lon] = venueCoords[match.id];
          newDistances[match.id] = calculateDistance(
            userLocation[0],
            userLocation[1],
            lat,
            lon
          );
        } else {
          newDistances[match.id] = null;
        }
      });

      setDistances(newDistances);
    }
  }, [matches, userLocation, venueCoords]);

  const sortedMatches = useMemo(() => {
    return sortByDistance
      ? [...matches].sort((a, b) => distances[a.id] - distances[b.id])
      : matches;
  }, [matches, sortByDistance, distances]);

  const formatDateRange = () => {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Europe/Sofia",
    };

    const start = new Date(startDate).toLocaleDateString("bg-BG", options);
    const end = new Date(endDate).toLocaleDateString("bg-BG", options);

    return start === end ? start : `${start} - ${end}`;
  };

  if (!userLocation || isProcessing || (matches?.length > 0 && !distances))
    return (
      <div className="loading">
        <div className="spinner"></div>
        {!userLocation
          ? "Намиране на местоположението Ви..."
          : "Зареждане на мачовете..."}
      </div>
    );

  if (!startDate || !endDate) {
    return (
      <div className="prompt-container">
        <h2>Моля, изберете дата за да видите мачовете</h2>
        <p>Изберете дата от календара по-горе и натиснете "Зареди мачове"</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Зареждане на мачове...</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      {/* Matches List */}
      <div className="matches-list">
        <div className="matches-header">
          <h2>Мачове от {formatDateRange()}</h2>
          <button
            className="sort-button"
            onClick={() => setSortByDistance(!sortByDistance)}
            disabled={!distances || matches?.length === 0}
          >
            {!distances
              ? "Изчисляване на разстоянието..."
              : sortByDistance
              ? "Покажи оригиналният лист"
              : "Сортирай по разстояние"}
          </button>
        </div>
        {matches?.length === 0 ? (
          <div className="no-matches">Няма мачове за тези дати!</div>
        ) : (
          sortedMatches.map((match) => (
            <div
              key={match.id}
              className={`match-card ${
                selectedMatch === match.id ? "selected" : ""
              }`}
              onClick={() => handleMatchClick(match)}
            >
              <div className="teams">
                <div className="team">
                  <img
                    src={
                      match.homeTeam.crest ||
                      "https://via.placeholder.com/30x30?text=🏆"
                    }
                    alt={match.homeTeam.shortName}
                    className="team-crest"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/30x30?text=🏆";
                    }}
                  />
                  <h3>{match.homeTeam.name}</h3>
                </div>

                <span className="vs">vs</span>

                <div className="team">
                  <img
                    src={
                      match.awayTeam.crest ||
                      "https://via.placeholder.com/30x30?text=🏆"
                    }
                    alt={match.awayTeam.shortName}
                    className="team-crest"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://via.placeholder.com/30x30?text=🏆";
                    }}
                  />
                  <h3>{match.awayTeam.name}</h3>
                </div>
              </div>

              <div className="match-details">
                <p>🗓 {new Date(match.utcDate).toLocaleString()}</p>
                <p className="competition">
                  <img
                    src={match.competition.emblem}
                    alt={match.competition.name}
                    className="competition-emblem"
                  />
                  {match.competition.name}
                </p>
                <p>🏟 Стадиона на {match.homeTeam.shortName} </p>
                {distances?.[match.id] !== null ? (
                  <p>📏 {distances[match.id].toFixed(1)} km </p>
                ) : (
                  <p> Недостъпно</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Map */}
      <div onClick={(e) => e.preventDefault()}>
        <MapContainer
          center={userLocation}
          zoom={6}
          minZoom={3}
          maxBounds={[
            [-90, -180],
            [90, 180],
          ]}
          maxBoundsViscosity={1.0}
          className="map"
          dragging={true}
          whenCreated={setMapInstance}
          worldCopyJump={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            noWrap={true}
            bounds={[
              [-85, -180],
              [85, 180],
            ]}
          />

          {/* User location */}
          <Marker position={userLocation} icon={redIcon}>
            <Popup>Вие сте тук!</Popup>
          </Marker>

          {/*  Stadium markers */}
          {sortedMatches.map((match) => {
            const coordinates = venueCoords[match.id];
            if (!coordinates) return null;

            return (
              <Marker
                key={`${match.id}-${sortByDistance}`}
                position={coordinates}
                icon={selectedMatch === match.id ? zoomIcon : blueIcon}
                eventHandlers={{
                  click: () => handleMatchClick(match),
                }}
              >
                <Popup>
                  <b>Стадиона на {match.homeTeam.shortName}</b>
                  <br />
                  {match.homeTeam.name} срещу {match.awayTeam.name}
                  <br />
                  {new Date(match.utcDate).toLocaleDateString()}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapComponent;
