import React, { useState, useRef } from "react";
import {
  getCountries,
  getProjectsByCountry,
  getProjectsByRegion,
} from "../services/datasetUtils";
import { getCountriesByRegion, getMapEntry } from "../services/mapUtils";
import scale from "../services/scale";
import "./ProjectsCountCircles.css";

const ProjectsCountCircles = ({ onClick }) => {
  const [projectsCountCircles] = useState(getProjectsCountCircles());
  return (
    <>
      {projectsCountCircles.map((projectsCountCircle, index) => (
        <ProjectsCountCircle
          key={index}
          {...projectsCountCircle}
          onClick={() =>
            onClick(projectsCountCircle.region || projectsCountCircle.country)
          }
        />
      ))}
    </>
  );
};

export default ProjectsCountCircles;

const ProjectsCountCircle = ({
  region,
  projectsCount,
  relativePosition,
  onClick,
}) => {
  const ref = useRef();
  const radius = useRadius(relativePosition);
  const color = useColor(relativePosition);
  const { x, y } = getCoordinates(ref.current, region);
  return (
    <g className="dots-map__projects-count-circle" onClick={onClick} ref={ref}>
      <circle cx={x} cy={y} r={radius} fill={color}>
        {projectsCount}
      </circle>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        alignmentBaseline="middle"
        fontSize="10px"
      >
        {projectsCount}
      </text>
    </g>
  );
};

function useRadius(relativePosition) {
  const min = 18;
  const max = 40;
  const range = max - min;
  const radius = Math.floor(range * relativePosition + min);
  return radius;
}

function useColor(relativePosition) {
  const colors = ["#F6AAAA", "#9EFAFB", "#BF93FF", "#F3D882"];
  const index = Math.ceil(relativePosition * colors.length) - 1;
  return colors[index];
}

function getProjectsCountCircles() {
  const isEuropean = (country) => country.region === "europe";
  const isDefined = (x) => !!x;
  const not =
    (fn) =>
    (...args) =>
      !fn(...args);
  const getMax = (max, entry) =>
    entry.projectsCount > max ? entry.projectsCount : max;

  const projectsCountCircles = getCountries()
    .map(getMapEntry)
    .filter(isDefined)
    .filter(not(isEuropean))
    .map((country) => ({
      region: country.id,
      projectsCount: getProjectsByCountry(country.id).length,
    }));
  projectsCountCircles.push({
    region: "europe",
    projectsCount: getProjectsByRegion("europe").length,
  });
  projectsCountCircles.push({
    region: "global",
    projectsCount: getProjectsByRegion("global").length,
  });
  const maxProjects = projectsCountCircles.reduce(getMax, 0);
  return projectsCountCircles.map((projectCountsCircle) => ({
    ...projectCountsCircle,
    relativePosition: projectCountsCircle.projectsCount / maxProjects,
  }));
}

function getCoordinates(element, region) {
  if (!element) {
    return { x: -100, y: -100 };
  }
  const svg = element.closest("svg");
  switch (region) {
    case "global": {
      return getGlobalCoordinates(svg);
    }
    case "europe": {
      return getEuropeCoordinates(svg);
    }
    default: {
      return getRegionCoordinates(svg, region);
    }
  }
}

function getGlobalCoordinates(svg) {
  return {
    x: scale(0.35, svg.clientWidth, 0),
    y: scale(0.5, svg.clientHeight, 0),
  };
}

function getEuropeCoordinates(svg) {
  const collectDots = (allDots, country) => [...allDots, ...country.dots];
  const europeDots = getCountriesByRegion("europe")
    .map(getMapEntry)
    .reduce(collectDots, []);
  return getCenterCoordinates(svg.clientWidth, svg.clientHeight, europeDots);
}

function getRegionCoordinates(svg, region) {
  const mapEntry = getMapEntry(region);
  return getCenterCoordinates(svg.clientWidth, svg.clientHeight, mapEntry.dots);
}

function getCenterCoordinates(width, height, allDots) {
  const averagePosition = (currentAverage, { x, y }, _, allDots) => ({
    x: currentAverage.x + x / allDots.length,
    y: currentAverage.y + y / allDots.length,
  });
  const relativeMiddlePoint = allDots.reduce(averagePosition, {
    x: 0,
    y: 0,
  });
  return {
    x: scale(relativeMiddlePoint.x, width, 0),
    y: scale(relativeMiddlePoint.y, height, 0),
  };
}
