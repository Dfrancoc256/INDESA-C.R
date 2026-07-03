import * as repo from "../repositories/dashboard.repository";

export async function getResumen() {
  return repo.getDashboardCounts();
}
