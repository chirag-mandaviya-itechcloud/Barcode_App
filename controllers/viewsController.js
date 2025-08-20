const searchViewForm = (req, res) => {
    try {
        return res.render('searchForm');
    } catch (error) {
        console.error('Error while rendering search form', error);
        return res.status(500).json({
            errorCode: 'RENDER_SEARCHFORM_ERROR',
            error
        });
    }
};

module.exports = { searchViewForm };
