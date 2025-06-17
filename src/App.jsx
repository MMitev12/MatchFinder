import "./App.css";
import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import MapComponent from "./MapComponent";
import ErrorBoundary from "./ErrorBoundary";

function App() {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(true);

  const handleDateSubmit = () => {
    if (startDate && endDate) {
      setShowDatePicker(false);
    }
  };

  const handleReset = () => {
    setStartDate(new Date());
    setEndDate(new Date());
    setShowDatePicker(true);
  };

  return (
    <div className="App">
      <header>
        <h1>Търсене на футболни мачове</h1>
        {showDatePicker ? (
          <div className="date-range-container">
            <div className="date-picker-group">
              <label>От дата:</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                minDate={new Date()}
                dateFormat="MMMM d, yyyy"
                className="custom-datepicker"
              />
            </div>
            <div className="date-picker-group">
              <label>До дата:</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                dateFormat="MMMM d, yyyy"
                className="custom-datepicker"
              />
            </div>
            {startDate && endDate && startDate > endDate && (
              <p style={{ color: "red", margin: "5px 0" }}>
                Началната дата не може да бъде след крайната дата!
              </p>
            )}
            <button
              className="load-button"
              onClick={handleDateSubmit}
              disabled={!startDate || !endDate || startDate > endDate}
            >
              Зареди мачове
            </button>
          </div>
        ) : (
          <div className="date-range-container">
            <button className="reset-button" onClick={handleReset}>
              Изберете друг период
            </button>
          </div>
        )}
      </header>
      <main>
        <ErrorBoundary>
          {showDatePicker ? (
            <div className="prompt-container">
              <h2>Моля, изберете период за да видите мачовете</h2>
              <p>
                Изберете начална и крайна дата от календара по-горе и натиснете
                "Зареди мачове"
              </p>
            </div>
          ) : (
            <MapComponent startDate={startDate} endDate={endDate} />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
