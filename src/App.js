import { useEffect, useState, useRef } from "react";
import DragIndicator from "./components/DragIndicator";
import DotsMap from "./components/DotsMap";
import CountryCard from "./components/CountryCard";
import getMapData from "./data/map";
import {
  getOrganizationCountries,
  getProjectByName,
  getProjectCountries,
  isCountryInProjects,
} from "./services/datasetUtils";
import ProjectCard from "./components/ProjectCard";
import Filters from "./components/Filters";
import OrganizationCard from "./components/OrganizationCard";
import "./App.css";
import { getHemisphere } from "./services/mapUtils";
import useMediumScreen from "./hooks/useMediumScreen";

const initialState = {
  cardType: null,
  countries: null,
  project: null,
};

function App() {
  const mapContainerRef = useRef();
  const isMediumScreen = useMediumScreen();
  const [map] = useState(prepare(getMapData()));
  const [state, setState] = useState(initialState);
  const updateState = (delta) => {
    const partialNewState = {
      ...initialState,
      ...delta,
    };
    const organizationCountries = partialNewState.organization
      ? getOrganizationCountries(partialNewState.organization)
      : null;
    const projectCountries = partialNewState.project
      ? getProjectCountries(partialNewState.project)
      : null;
    const countries =
      partialNewState.countries || organizationCountries || projectCountries;
    setState({
      ...partialNewState,
      countries,
    });
  };
  const closeEverything = () => updateState({});
  useEffect(() => {
    exposeApi(updateState);
  }, []);
  useEffect(() => {
    if (!isMediumScreen || !mapContainerRef.current) {
      return;
    }
    scrollToMiddle(mapContainerRef.current);
  }, [isMediumScreen, mapContainerRef]);
  return (
    <div className="dots-map">
      <div className="dots-map__filters-container">
        <Filters
          onDropdownClick={closeEverything}
          onCountryClick={(country) =>
            updateState({ cardType: "country", countries: [country] })
          }
          onProjectClick={(project) =>
            updateState({ cardType: "project", project })
          }
          onOrganizationClick={(organization) =>
            updateState({ cardType: "organization", organization })
          }
        />
      </div>
      <div className="dots-map__main">
        <div className="dots-map__map-container" ref={mapContainerRef}>
          <DotsMap
            map={map}
            onCountrySelected={(country) =>
              updateState({ cardType: "country", countries: [country] })
            }
            selectedCountries={state.countries || []}
            selectedColor={window.dotsMapConfig.selectedColor || "#DB4437"}
          />
        </div>
        {isMediumScreen && <DragIndicator />}
        {state.cardType && (
          <Backdrop onDismiss={() => setState({})}>
            {state.cardType === "project" && (
              <ProjectCard
                project={state.project}
                onClose={closeEverything}
                className={getProjectCardClassName(state.project)}
              />
            )}
            {state.cardType === "country" && (
              <CountryCard
                country={state.countries[0]}
                onProjectClick={(project) =>
                  setState({ cardType: "project", project })
                }
                onClose={closeEverything}
                className={getCountryCardClassName(state.countries[0])}
              />
            )}
            {state.cardType === "organization" && (
              <OrganizationCard
                organization={state.organization}
                onProjectClick={(project) =>
                  setState({ cardType: "project", project })
                }
                onClose={closeEverything}
                className={getOrganizationCardClassName(state.organization)}
              />
            )}
          </Backdrop>
        )}
      </div>
    </div>
  );
}

export default App;

const Backdrop = ({ onDismiss, children }) => (
  <>
    <div
      className="dots-map__backdrop"
      onClick={(event) => {
        const isBackdropClicked =
          event.target.classList.contains("dots-map__backdrop");
        if (!isBackdropClicked) {
          return;
        }
        onDismiss();
      }}
    >
      {children}
    </div>
  </>
);

function prepare(map) {
  return map.map((country) => ({
    ...country,
    color:
      country.color || isCountryInProjects(country.id)
        ? getRandomColor()
        : window.dotsMapConfig.dotColor || "#C8C8CA",
    dots: country.dots.map((dot) => ({
      ...dot,
      radius: window.dotsMapConfig.dotRadius || getDotRadius(),
    })),
  }));
}

function getRandomColor() {
  const colors = window.dotsMapConfig.randomColorSet || ["#9963f7"];
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

function getDotRadius() {
  return 2.5;
}

function getProjectCardClassName(project) {
  return getCardHemisphereClassName(
    getHemisphere(getProjectCountries(project)[0])
  );
}

function getCountryCardClassName(country) {
  return getCardHemisphereClassName(getHemisphere(country));
}

function getOrganizationCardClassName(organization) {
  return getCardHemisphereClassName(
    getHemisphere(getOrganizationCountries(organization)[0])
  );
}

function getCardHemisphereClassName(hemisphere) {
  return `dots-map__card--${hemisphere}`;
}

function exposeApi(updateState) {
  window.dotsMapApi = {
    selectCountries: (countries, openCard) =>
      updateState({ countries, cardType: openCard ? "country" : null }),
    selectOrganization: (organization, openCard) =>
      updateState({ organization, cardType: openCard ? "organization" : null }),
    selectProject: (project, openCard) =>
      updateState({
        project: getProjectByName(project),
        cardType: openCard ? "project" : null,
      }),
  };
}

async function scrollToMiddle(element) {
  // XXX: Possibly the least elegant solution to the problem, I know
  const interval = setInterval(() => {
    element.scrollTo(element.clientWidth / 2, 0);
  }, 25);
  setTimeout(() => clearInterval(interval), 1500);
}
