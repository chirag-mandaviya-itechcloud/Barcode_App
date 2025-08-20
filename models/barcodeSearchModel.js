const { DataTypes } = require('sequelize');

const barCodeSearch = (Sequelize, sequelize) => {
    if (sequelize) {
        const barCodeSearch = sequelize.define('BarCodeSearchConfiguration', {
            'ViewSQLName': {
                type: DataTypes.STRING,
                allowNull: false
            },
            'ViewUIName': {
                type: DataTypes.STRING,
                allowNull: false
            },
            'SearchColumnSQLName': {
                type: DataTypes.STRING,
            },
            'SearchColumnUIName': {
                type: DataTypes.STRING,
            },
            'SearchColumnType': {
                type: DataTypes.STRING,
            },
            'Precedence': {
                type: DataTypes.INTEGER,
                default: 0
            },
            'ViewColumnSQLName': {
                type: DataTypes.STRING,
            },
            'ViewColumnUIName': {
                type: DataTypes.STRING,
            },
        }, { timestamps: false, freezeTableName: true });
        barCodeSearch.removeAttribute('id');
        return barCodeSearch;
    }
};

module.exports = { barCodeSearch };
