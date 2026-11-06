/*
 * Long Beach, NY municipal directory — used by the 🥜 Peanut seed.
 * Source: each department's own page on https://www.longbeachny.gov (checked 2026-11-06).
 * Numbers change: re-check before relying on them, and edit freely.
 * `keys` are matched (lower-case) against the topics / reason / notes of a call.
 */
(function (root) {
  var BASE = 'https://www.longbeachny.gov/';
  var D = function (id, name, phone, path, keys, extra) {
    var o = { id: id, name: name, phone: phone, url: BASE + path, keys: keys };
    for (var k in (extra || {})) o[k] = extra[k];
    return o;
  };
  root.LB_DIRECTORY = {
    city: 'Long Beach, NY',
    checked: '2026-11-06',
    source: 'longbeachny.gov',
    hall: { name: 'Long Beach City Hall (main line)', phone: '(516) 431-1000', address: '1 West Chester Street, Long Beach, NY 11561', url: BASE },
    depts: [
      D('building', 'Building Department', '(516) 431-1005', 'building',
        ['building', 'permit', 'construction', 'inspection', 'zoning', 'zone', 'renovation', 'contractor', 'certificate', 'occupancy', 'demolition', 'plans', 'industrial'],
        { room: 'City Hall, Room 304', fax: '(516) 431-1432', email: 'lbbuilding@longbeachny.gov' }),
      D('cityclerk', 'City Clerk — Licenses & Records', '(516) 431-1002', 'cityclerk',
        ['mercantile', 'license', 'licence', 'licensing', 'clerk', 'records', 'foil', 'marriage', 'permit', 'business'],
        { room: 'City Hall, Room 307', fax: '(516) 431-2717' }),
      D('econ', 'Economic Development & Planning', '(516) 705-7284', 'econ-development',
        ['economic', 'development', 'developer', 'business', 'incentive', 'rebate', 'investment', 'real estate', 'project', 'industrial', 'mercantile', 'grant'],
        { room: 'City Hall, Room 500', email: 'EconomicDevelopment@longbeachny.gov' }),
      D('planning', 'Planning Board', '(516) 705-7215', 'planning',
        ['planning', 'site plan', 'subdivision', 'development', 'zone', 'zoning', 'industrial', 'approval', 'project']),
      D('zba', 'Zoning Board of Appeals', '(516) 705-7215', 'zoning',
        ['zoning', 'variance', 'appeal', 'setback', 'zone', 'industrial', 'special permit', 'use']),
      D('dpw', 'Public Works', '(516) 431-1011', 'publicworks',
        ['public works', 'street', 'road', 'pothole', 'sewer', 'water', 'leak', 'main', 'sidewalk', 'drain', 'flood'],
        { room: 'City Hall, Room 404' }),
      D('sanitation', 'Sanitation & Recycling', '(516) 432-3132', 'sanitation', ['garbage', 'trash', 'recycling', 'sanitation', 'pickup', 'bulk']),
      D('sewer', 'Sewer Maintenance', '(516) 705-7418', 'sewer', ['sewer', 'backup', 'drain', 'sewage']),
      D('street', 'Street Maintenance', '(516) 431-7174', 'street-maint', ['street', 'pothole', 'road', 'paving', 'snow', 'sidewalk']),
      D('watersewer', 'Water/Sewer Administration', '(516) 431-1007', 'water-sewer', ['water bill', 'sewer bill', 'water', 'meter', 'billing'],
        { room: 'City Hall, Room 302', fax: '(516) 431-1343' }),
      D('assessor', 'Tax Assessor', '(516) 431-1009', 'tax-assessor', ['assessor', 'assessment', 'grievance', 'property tax', 'exemption', 'valuation'],
        { room: 'City Hall, Room 301', email: 'lbassessor@longbeachny.gov' }),
      D('tax', 'Tax Department', '(516) 431-1008', 'tax', ['tax', 'tax bill', 'taxes', 'payment', 'receiver']),
      D('comptroller', 'City Comptroller', '(516) 431-1004', 'comptroller', ['comptroller', 'finance', 'invoice', 'vendor payment', 'budget'], { room: 'City Hall, Room 503' }),
      D('counsel', 'Corporation Counsel', '(516) 431-1003', 'corporation-counsel', ['legal', 'counsel', 'attorney', 'ordinance', 'law', 'lawsuit']),
      D('court', 'City Court', '(516) 442-8544', 'court', ['court', 'ticket', 'summons', 'violation', 'parking', 'fine', 'judge']),
      D('police', 'Police Department — non-emergency', '(516) 431-1800', 'lbpd', ['police', 'noise', 'theft', 'accident', 'complaint', 'parking']),
      D('fire', 'Fire Department — non-emergency', '(516) 431-2434', 'fire', ['fire', 'hydrant', 'smoke', 'alarm', 'fire marshal']),
      D('community', 'Community Development', '(516) 705-7288', 'community', ['community', 'housing', 'grant', 'cdbg', 'rehab'], { room: 'City Hall, Room 502' }),
      D('animal', 'Animal Control (shelter, non-emergency)', '(516) 431-7674', 'animal-control', ['animal', 'dog', 'cat', 'stray', 'pet', 'shelter']),
      D('purchasing', 'Purchasing', '(516) 705-7207', 'purchasing', ['purchasing', 'bid', 'rfp', 'vendor', 'procurement', 'contract'], { room: 'City Hall, Room 509' }),
      D('transport', 'Transportation', '(516) 705-7395', 'transportation', ['bus', 'transit', 'transportation', 'shuttle', 'parking']),
      D('oem', 'Emergency Management', '(516) 431-1001', 'emergency-management', ['emergency', 'storm', 'evacuation', 'hurricane', 'flood'])
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
