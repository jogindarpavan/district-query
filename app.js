const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDBObjectToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const covertDistrictObjectToResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getStatesQuery = `
        SELECT 
        *
        FROM
        state;`;
  const getStatesArray = await db.all(getStatesQuery);
  response.send(
    getStatesArray.map((state) => convertDBObjectToResponseObject(state))
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
        SELECT 
        *
        FROM
        state
        WHERE
        state_id = ${stateId};`;
  const getStateArray = await db.get(getStateQuery);
  response.send(convertDBObjectToResponseObject(getStateArray));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const addDistrictDetails = `
        INSERT INTO
            district(district_name,state_id,cases,cured,active,deaths)
        VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths});`;
  await db.run(addDistrictDetails);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictDetails = `
       SELECT *
       FROM
       district
       WHERE
       district_id = ${districtId};`;
  const getDistrictArray = await db.get(getDistrictDetails);
  response.send(covertDistrictObjectToResponseObject(getDistrictArray));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
    district
    WHERE
    district_id = ${districtId};`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const { districtId } = request.params;
  const updateDistrictQuery = `
    UPDATE
     district
    SET
        district_name : '${districtName}',
        state_id : ${stateId},
        cases : ${cases},
        cured : ${cured},
        active : ${active},
        deaths : ${deaths}
    WHERE 
        district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const addStateStats = `
   SELECT
     SUM(cases) AS totalCases,
     SUM(cured) AS totalCured,
     SUM(active) AS totalActive,
     SUM(deaths) AS totalDeaths
   FROM
     district
   WHERE 
     state_id = ${stateId};`;
  const district = await db.get(addStateStats);
  response.send(district);
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictWithStateDetails = `
     SELECT 
      state_name AS stateName
     FROM
      state INNER JOIN district
      ON state.state_id = district.state_id
     WHERE
     district_id = ${districtId};`;
  const stateName = await db.get(getDistrictWithStateDetails);
  response.send(stateName);
});

module.exports = app;
