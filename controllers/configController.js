const Papa = require('papaparse');
const fs = require('fs');
const path = require("path");
const { Op } = require('sequelize');
const { getModels } = require('../utils/db');

const { logger } = require('../utils/logging');

const fetchAllViewForSearch = async (req, res) => {
    const { barCodeSearch } = getModels();
    try {
        const data = await barCodeSearch.findAll({
            attributes: ['ViewSQLName', 'ViewUIName'],
            group: ['ViewSQLName', 'ViewUIName']
        });

        return res.status(200).json({
            message: 'All Views Fetched successfully!',
            data: data.map(i => ({ label: i.ViewUIName, value: i.ViewSQLName }))
        });
    } catch (error) {
        console.error('Error while fetching all views', error);
        return res.status(500).json({
            errorCode: 'FETCH_VIEWS_ERROR',
            error
        });
    }
};

const fetchFieldsForSearch = async (req, res) => {
    const { barCodeSearch } = getModels();
    try {
        const { viewName } = req.query;

        const data = await barCodeSearch.findAll({
            attributes: ['SearchColumnSQLName', 'SearchColumnUIName'],
            where: {
                ViewSQLName: viewName,
                ViewColumnSQLName: {
                    [Op.eq]: null
                }
            },
            order: [['Precedence', 'ASC']]
        });

        return res.status(200).json({
            message: 'Fields fetched successfully!',
            data: data.map(i => ({ label: i.SearchColumnUIName, value: i.SearchColumnSQLName, type: i.SearchColumnType }))
        });
    } catch (error) {
        logger.error('Error while fetching all fields', error);
        return res.status(500).json({
            errorCode: 'FETCH_FIELDS_ERROR',
            error
        });
    }
};

const fetchFieldsOptions = async (req, res) => {
    const { barCodeSearch } = getModels();
    try {
        const { viewName, fieldName, filters } = req.query;
        const filterJson = JSON.parse(filters);
        let sqlQuery = `SELECT ${fieldName} FROM ${viewName}`;

        if (filterJson instanceof Object && Object.keys(filterJson).length > 0) {
            const keysArr = Object.keys(filterJson).filter(i => filterJson[i] !== null);

            keysArr.forEach((i, inx) => {
                if (inx === 0) sqlQuery += ' WHERE';
                if (typeof filterJson[i] === 'string') sqlQuery += ` ${i} = '${filterJson[i]}'`;
                else sqlQuery += ` ${i} = ${filterJson[i]}`;
                if (inx !== keysArr.length - 1) sqlQuery += ' AND';
            });
        }

        sqlQuery += ` GROUP BY ${fieldName}`;

        // const data = await db.sequelize.query(sqlQuery);
        // const data = await db.getSequelizeFromConfig().query(sqlQuery);
        const data = await barCodeSearch.sequelize.query(sqlQuery);

        return res.status(200).json({
            message: 'Fields fetched successfully!',
            data: data[0].map(i => ({ label: i[fieldName], value: i[fieldName] }))
        });
    } catch (error) {
        logger.error('Error while fetching all field options', error);
        return res.status(500).json({
            errorCode: 'FETCH_FIELD_OPTIONS_ERROR',
            error
        });
    }
};

const fetchSearchedData = async (req, res) => {
    const { barCodeSearch } = getModels();
    try {
        const { viewName, filters } = req.query;
        const filterJson = JSON.parse(filters);
        const columns = [];
        let sqlQuery = 'SELECT';

        const data = await barCodeSearch.findAll({
            attributes: ['ViewColumnSQLName', 'ViewColumnUIName'],
            where: {
                ViewSQLName: viewName,
                SearchColumnSQLName: {
                    [Op.eq]: null
                }
            },
            order: [['Precedence', 'ASC']]
        });

        data.forEach((i, inx) => {
            columns.push({ label: i.ViewColumnUIName, value: i.ViewColumnSQLName });
        });

        sqlQuery += ` * FROM ${viewName}`;

        if (filterJson instanceof Object && Object.keys(filterJson).length > 0) {
            const keysArr = Object.keys(filterJson).filter(i => filterJson[i] !== null);
            keysArr.forEach((i, inx) => {
                if (inx === 0) sqlQuery += ' WHERE';
                if (typeof filterJson[i] === 'string') sqlQuery += ` ${i} = '${filterJson[i]}'`;
                else sqlQuery += ` ${i} = ${filterJson[i]}`;
                if (inx !== keysArr.length - 1) sqlQuery += ' AND';
            });
        }

        // const rows =  await db.sequelize.query(sqlQuery);
        // const rows = await db.getSequelizeFromConfig().query(sqlQuery);
        const rows = await barCodeSearch.sequelize.query(sqlQuery);

        return res.status(200).json({
            message: 'data fetched successfully!',
            rows: rows[0],
            columns
        });
    } catch (error) {
        logger.error('Error while fetching data', error);
        return res.status(500).json({
            errorCode: 'FETCH_DATA_ERROR',
            error
        });
    }
};

const generateCSVForBarcode = async (req, res) => {
    const { csvLocationForView } = getModels();
    const dataDir = process.env.BARCODE_APP_DATA || process.cwd();
    const configDir = path.join(dataDir, 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    const downloadPathConfig = path.join(configDir, 'downloadPath.json');
    const pathConfig = JSON.parse(await fs.promises.readFile(downloadPathConfig, 'utf-8'));
    try {
        const { data, quantity, viewName } = req.body;
        const totalrows = [];

        for (let i = 0; i < quantity; i++) {
            totalrows.push(data);
        }

        if (totalrows.length > 0) {
            const locationForData = await csvLocationForView.findAll({
                attributes: ['Location'],
                where: { ViewName: viewName }
            });
            const location = locationForData[0].Location;
            const csvData = Papa.unparse(totalrows, { newline: '\n' });

            // Get user's download directory
            const downloadsDir = path.join(pathConfig.path, 'Pixel-Barcode-App', 'CSV', viewName);

            // Ensure the directory exists
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }

            // Build the file path
            const filePath = path.join(downloadsDir, `barcode_${viewName}_${Date.now()}.csv`);

            // Write the CSV file
            fs.writeFileSync(filePath, csvData);
            logger.info(`CSV file generated successfully at ${filePath}`);
            return res.status(200).json({ message: 'Barcode CSV generated successfully!' });
        } else {
            return res.status(400).json({ message: 'No data to generate CSV.' });
        }
    } catch (error) {
        logger.error('Error while generating csv data', error);
        return res.status(500).json({
            errorCode: 'GENERATE_CSV_BARCODE_ERROR',
            error
        });
    }
};

module.exports = {
    fetchAllViewForSearch,
    fetchFieldsForSearch,
    fetchFieldsOptions,
    fetchSearchedData,
    generateCSVForBarcode
};
