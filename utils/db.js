import { Sequelize } from 'sequelize';
import { barCodeSearch } from '../models/barcodeSearchModel.js';
import { csvLocationForView } from '../models/csvLocationForModel.js';
import path from 'path';
import fs from 'fs';

import { logger } from './logging.js';

const dataDir = process.env.BARCODE_APP_DATA || process.cwd();
const configDir = path.join(dataDir, 'config');
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
}
const configPath = path.join(configDir, 'config.json');

let sequelize = null;
let models = {};

export function getSequelizeFromConfig() {
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    if (config.DB_TYPE === 'postgres') {
        return new Sequelize(
            config.DB_NAME.toString(),
            config.DB_USER.toString(),
            config.DB_PASSWORD.toString(),
            {
                dialect: "postgres",
                host: config.DB_HOST.toString(),
                port: config.DB_PORT,
                // for hosted postgresql with ssl...
                // dialectOptions: {
                //     ssl: {
                //         require: true,
                //         rejectUnauthorized: false
                //     }
                // },
                logging: (msg) => logger.info(msg),
            }
        );
    } else {
        return new Sequelize(
            config.DB_NAME.toString(),
            config.DB_USER.toString(),
            config.DB_PASSWORD.toString(),
            {
                dialect: 'mssql',
                host: config.DB_HOST.toString().split('\\')[0] || '',
                // port: config.DB_PORT,
                dialectOptions: {
                    options: {
                        appName: 'BarcodeApp',
                        trustServerCertificate: true,
                        encrypt: false,
                        instanceName: config.DB_HOST.toString().split('\\')[1] || ''
                    }
                },
                logging: (msg) => logger.info(msg),
            }
        );
    }
}

// //DATABASE MODELS_TABLES SYNCS...
// export const db = {
//     Sequelize: Sequelize,
//     getSequelizeFromConfig,

//     //bar code search configurations...
//     barCodeSearch: barCodeSearch(Sequelize, getSequelizeFromConfig()),
//     csvLocationForView: csvLocationForView(Sequelize, getSequelizeFromConfig())
// };


export const initializeModels = async () => {
    sequelize = getSequelizeFromConfig();
    if (!sequelize) return;

    models.barCodeSearch = barCodeSearch(Sequelize, sequelize);
    models.csvLocationForView = csvLocationForView(Sequelize, sequelize);
    logger.info("Models initialized successfully");

    // insert default records if not exist...
    // try {
    //     await sequelize.sync({ alter: true });

    //     const count = await models.barCodeSearch.count();
    //     if (count === 0) {
    //         logger.info("No records found in barCodeSearch table");
    //         await models.barCodeSearch.bulkCreate([
    //             {
    //                 ViewSQLName: 'vw_LBL_40PO_Detail',
    //                 ViewUIName: 'PO-Detail',
    //                 SearchColumnSQLName: 'PurchaseOrder',
    //                 SearchColumnUIName: 'Purchase Order',
    //                 Precedence: 0,
    //                 ViewColumnSQLName: null,
    //                 ViewColumnUIName: null
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_40PO_Detail',
    //                 ViewUIName: 'PO-Detail',
    //                 SearchColumnSQLName: 'Line',
    //                 SearchColumnUIName: 'Line',
    //                 Precedence: 1,
    //                 ViewColumnSQLName: null,
    //                 ViewColumnUIName: null
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_40PO_Detail',
    //                 ViewUIName: 'PO-Detail',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 0,
    //                 ViewColumnSQLName: 'PurchaseOrder',
    //                 ViewColumnUIName: 'Purchase Order'
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_40PO_Detail',
    //                 ViewUIName: 'PO-Detail',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 1,
    //                 ViewColumnSQLName: 'LineType',
    //                 ViewColumnUIName: 'Line Type'
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_40PO_Detail',
    //                 ViewUIName: 'PO-Detail',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 2,
    //                 ViewColumnSQLName: 'MStockDesc',
    //                 ViewColumnUIName: 'Stock Description'
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: 'StockCode',
    //                 SearchColumnUIName: 'Stock Code',
    //                 Precedence: 0,
    //                 ViewColumnSQLName: null,
    //                 ViewColumnUIName: null
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: 'Warehouse',
    //                 SearchColumnUIName: 'Warehouse Type',
    //                 Precedence: 1,
    //                 ViewColumnSQLName: null,
    //                 ViewColumnUIName: null
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: 'Lot No',
    //                 SearchColumnUIName: 'Lot No',
    //                 Precedence: 2,
    //                 ViewColumnSQLName: null,
    //                 ViewColumnUIName: null
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 0,
    //                 ViewColumnSQLName: 'TrnQuantity',
    //                 ViewColumnUIName: 'Quantity'
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 1,
    //                 ViewColumnSQLName: 'TrnValue',
    //                 ViewColumnUIName: 'Value'
    //             },
    //             {
    //                 ViewSQLName: 'vw_LBL_X91LotTransactions',
    //                 ViewUIName: 'Lot-Transactions',
    //                 SearchColumnSQLName: null,
    //                 SearchColumnUIName: null,
    //                 Precedence: 2,
    //                 ViewColumnSQLName: 'Reference',
    //                 ViewColumnUIName: 'Reference'
    //             }
    //         ]);
    //         logger.info("Default records inserted into barCodeSearch table");
    //     }

    //     const csvCount = await models.csvLocationForView.count();
    //     if (csvCount === 0) {
    //         logger.info("No records found in csvLocationForView table");
    //         await models.csvLocationForView.bulkCreate([
    //             {
    //                 ViewName: 'vw_LBL_40PO_Detail',
    //                 Location: './CSV/vw_LBL_40PO_Detail'
    //             }, {
    //                 ViewName: 'vw_LBL_X91LotTransactions',
    //                 Location: './CSV/vw_LBL_X91LotTransactions'
    //             }
    //         ]);
    //         logger.info("Default records inserted into csvLocationForView table");
    //     }
    //     logger.info("Database synced successfully");
    // } catch (error) {
    //     logger.error("Error initializing models:", error);
    // }
}

export const getModels = () => models;

//FINAL DATABASE CONNECTION...
export const connectionDB = async () => {
    sequelize = getSequelizeFromConfig();
    if (!sequelize) throw new Error("DB config not found or invalid");
    try {
        await sequelize.authenticate();
        logger.info(`Database Connection has been established successfully!`);
        return sequelize;
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        await sequelize.close();
        throw error;
    }
};
