export = {
    'packagesDir': {
        'doc': 'The relative directory the packages are stored in.',
        'format': String,
        'default': 'packages',
        'env': 'SLN_PACKAGES_DIR'
    },
    'output': {
        'success': {
            'doc': 'The content used in the terminal for success.',
            'format': String,
            'default': '   :white_check_mark:',
            'env': 'SLN_OUTPUT_SUCCESS'
        },
        'fail': {
            'doc': 'The content used in the terminal for fail.',
            'format': String,
            'default': '   :negative_squared_cross_mark:',
            'env': 'SLN_OUTPUT_FAIL'
        },
        'none': {
            'doc': 'The content used in the terminal for n/a.',
            'format': String,
            'default': '',
            'env': 'SLN_OUTPUT_NONE'
        }
    }
}
