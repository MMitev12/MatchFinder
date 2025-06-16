import axios from "axios";

//  Stadium geocoding
export const geocodeStadium = async (stadium) => {
  const searchQuery = `${stadium}`;

  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}`,
      {
        headers: {
          "User-Agent": "FootballVenueMapper",
        },
      }
    );

    if (!response.data?.[0]?.lat || !response.data?.[0]?.lon) {
      console.error("Невалидни координати за стадион:", stadium);
      return null;
    }

    return response.data[0]
      ? {
          coordinates: [
            parseFloat(response.data[0].lat),
            parseFloat(response.data[0].lon),
          ],
          address: response.data[0].display_name,
          searchedFor: searchQuery,
        }
      : null;
  } catch (error) {
    console.error(
      `Геокодирането се провали за ${searchQuery}:`,
      error.response?.data || error.message
    );
    return null;
  }
};

// Geocode filtered matches
export const geocodeFilteredMatches = async (filteredMatches, cancelToken) => {
  console.log(
    "Геокодиране на мачове за периода:",
    filteredMatches.length > 0
      ? `Ден: ${new Date().toLocaleDateString()} | Първи мач: ${new Date(
          filteredMatches[0].utcDate
        ).toLocaleString()}`
      : "Няма мачове"
  );

  if (!filteredMatches?.length) return {};

  const coords = {};
  let lastRequestTime = 0;
  const MIN_DELAY = 20000;
  const MAX_RETRIES = 3;

  for (const match of filteredMatches) {
    let retryCount = 0;
    let success = false;

    while (retryCount < MAX_RETRIES && !success) {
      try {
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;

        if (timeSinceLast < MIN_DELAY) {
          await new Promise((resolve) =>
            setTimeout(resolve, MIN_DELAY - timeSinceLast)
          );
        }

        if (cancelToken.reason) break;

        const teamResponse = await axios.get(`api/teams/${match.homeTeam.id}`, {
          cancelToken,
        });

        const stadiumName = teamResponse.data.venue;
        const result = await geocodeStadium(stadiumName);

        if (result?.coordinates) {
          coords[match.id] = result.coordinates;
        }

        lastRequestTime = Date.now();
        success = true;
      } catch (error) {
        if (error.response?.status === 429) {
          const delay = Math.pow(2, retryCount) * 20000;
          console.warn(
            `Достигнат е лимита на заявки, повторен опит след ${
              delay / 1000
            } секунди...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
        } else {
          console.error(`Прескачане на мач ${match.id}:`, error.message);
          break;
        }
      }
    }

    if (!success) {
      console.error(
        `Неуспешно извличане на мач ${match.id} след ${MAX_RETRIES} опита`
      );
    }
  }

  return coords;
};
