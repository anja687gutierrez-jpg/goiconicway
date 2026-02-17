/*
 * IMAGE CONFIGURATION FILE
 * GoIconicWay
 *
 * To update an image:
 * 1. Add your new image file to this folder
 * 2. Change the filename below to your new image
 * 3. Refresh the website - done!
 *
 * Example: To change testimonial 1 image:
 *   testimonial1: "my-new-happy-customer.jpg"
 */

const siteImages = {

    // ==========================================
    // TESTIMONIALS / KUNDENBEWERTUNGEN
    // ==========================================
    testimonial1: "tesla_red_client.jpg",        // Mike R. - Colorado
    testimonial2: "cybertruckreview.jpg",        // Sarah K. - Texas
    testimonial3: "teslacamping-pch.jpg",         // Jessica M. - Oregon

    // ==========================================
    // ROUTES / ROUTEN
    // ==========================================
    route_pacific_coast: "pacificcoasthighway.jpg",
    route_rocky_mountain: "rockymountainroute.jpg",
    route_66: "route66-tesla.jpg",
    route_yellowstone: "yellowstone.jpg",
    route_coastal: "coastal-route-tesla.jpg",
    route_zion: "zion-campsite-tesla.jpg",
    route_7day: "7-day-road-trip.jpg",
    route_14day: "14-days-sunsets-skyline.jpg",

    // ==========================================
    // FLEET / FAHRZEUGE
    // ==========================================
    fleet_modely: "teslamodely_flipcard1.jpg",
    fleet_cybertruck: "cybertruck_flipcard2.jpg",
    fleet_redtesla_coastal: "redteslacoastal.jpg",
    fleet_redtesla_sandiego: "redteslasandiego.jpg",

    // ==========================================
    // DESTINATIONS / REISEZIELE
    // ==========================================
    dest_chicago: "chicago.jpg",
    dest_sandiego: "sandiego.jpg",

    // ==========================================
    // HERO / HEADER
    // ==========================================
    hero_background: "tesla_camping_new.jpg",

    // ==========================================
    // MISC / SONSTIGES
    // ==========================================
    founder: "anja-founder.jpg",
    compass_hero: "compass.jpg",
    favicon: "flaviconicon.png"

};

// Apply images to elements with data-img attribute
function applyConfigImages() {
    document.querySelectorAll('[data-img]').forEach(el => {
        const imgKey = el.getAttribute('data-img');
        if (siteImages[imgKey]) {
            if (el.tagName === 'IMG') {
                el.src = siteImages[imgKey];
            } else {
                el.style.backgroundImage = `url('${siteImages[imgKey]}')`;
            }
        }
    });
}

// Run when page loads
document.addEventListener('DOMContentLoaded', applyConfigImages);
