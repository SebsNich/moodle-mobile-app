// ESPACIADO GLOBAL DE LA APP
// Usar estos valores en todas las pantallas

export const spacing = {
    // Espaciado base
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,

    // Bordes redondeados
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
        full: 999,
    },

    // Sombras
    shadow: {
        small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        },
        medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        },
        large: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        },
    },
};