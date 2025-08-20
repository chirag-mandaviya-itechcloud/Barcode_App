const { DataTypes } = require('sequelize');

const csvLocationForView = (Sequelize, sequelize) => {
    if (sequelize) {
        const csvLocationForView = sequelize.define('BarcodeCSVLocationForView', {
            'ViewName': {
                type: DataTypes.STRING,
                allowNull: false
            },
            'Location': {
                type: DataTypes.STRING,
                allowNull: false
            }
        }, { timestamps: false, freezeTableName: true });
        csvLocationForView.removeAttribute('id');
        return csvLocationForView;
    }
};

module.exports = { csvLocationForView };
