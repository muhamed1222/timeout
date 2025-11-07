import {
  getMockActiveShifts,
  getMockCompanyStats,
  getMockRatings,
  getMockEmployees,
  getMockViolationRules,
} from "./devData.js";

export const useMockApiData = process.env.USE_API_MOCKS === "true";

export {
  getMockActiveShifts,
  getMockCompanyStats,
  getMockRatings,
  getMockEmployees,
  getMockViolationRules,
};
