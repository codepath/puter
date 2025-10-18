import assert from 'assert';

// Standalone contrast calculation function for testing
// This mirrors the implementation in ThemeService.calculateSidebarTextColor
function calculateSidebarTextColor(lightness, saturation) {
    const baseThreshold = 50;
    const saturationAdjustment = (saturation - 50) * 0.1;
    const adjustedThreshold = baseThreshold + saturationAdjustment;

    return lightness < adjustedThreshold ? 'white' : '#373e44';
}

describe('Sidebar text contrast calculation', () => {
    describe('calculateSidebarTextColor', () => {
        it('should return white text for dark backgrounds (low lightness)', () => {
            const result = calculateSidebarTextColor(20, 50);
            assert.equal(result, 'white');
        });

        it('should return dark text for light backgrounds (high lightness)', () => {
            const result = calculateSidebarTextColor(80, 50);
            assert.equal(result, '#373e44');
        });

        it('should handle edge case: minimum lightness (0%)', () => {
            const result = calculateSidebarTextColor(0, 50);
            assert.equal(result, 'white');
        });

        it('should handle edge case: maximum lightness (100%)', () => {
            const result = calculateSidebarTextColor(100, 50);
            assert.equal(result, '#373e44');
        });

        it('should handle threshold boundary with low saturation', () => {
            const result = calculateSidebarTextColor(50, 0);
            assert.equal(result, '#373e44');
        });

        it('should handle threshold boundary with high saturation', () => {
            const result = calculateSidebarTextColor(50, 100);
            assert.equal(result, 'white');
        });

        it('should adjust threshold based on saturation for better contrast', () => {
            // Test that saturation affects the threshold calculation
            const lowSatResult = calculateSidebarTextColor(48, 0);
            const highSatResult = calculateSidebarTextColor(48, 100);
            
            // With low saturation, threshold is lower, so 48% lightness should give dark text
            assert.equal(lowSatResult, '#373e44');
            // With high saturation, threshold is higher, so 48% lightness should give white text
            assert.equal(highSatResult, 'white');
        });

        it('should handle extreme saturation values', () => {
            // Test with edge case saturation values
            const result1 = calculateSidebarTextColor(50, 0);
            const result2 = calculateSidebarTextColor(50, 100);
            
            // Both should return valid color values
            assert.ok(result1 === 'white' || result1 === '#373e44');
            assert.ok(result2 === 'white' || result2 === '#373e44');
        });

        it('should maintain consistent behavior across lightness range', () => {
            // Test that the function behaves consistently across the full range
            let previousResult = null;
            let transitionCount = 0;
            
            for (let lightness = 0; lightness <= 100; lightness += 10) {
                const result = calculateSidebarTextColor(lightness, 50);
                
                if (previousResult && previousResult !== result) {
                    transitionCount++;
                }
                previousResult = result;
                
                // Ensure only valid colors are returned
                assert.ok(result === 'white' || result === '#373e44');
            }
            
            // Should have exactly one transition from white to dark text
            assert.equal(transitionCount, 1);
        });
    });
});