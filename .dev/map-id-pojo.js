import { bulkUpdateMapsLinks } from './map.service.js';


export const mapGraph = {
  AV1lKxUDArOcODrZAgaQ: {
    W: "BoDOb3lgb6Z3fMk8UhKP",
    E: "GijGXx13yedhOXZq694U",
    N: "I8hahrSpL3j8FdMCzp94",
    S: "Jx2rD9TSjts2jlXn1ZXM",
  },
  
  BoDOb3lgb6Z3fMk8UhKP: {
    E: "AV1lKxUDArOcODrZAgaQ",
    N: "PhbgBZBKSM4TQCALpORE",
    S: "NztlAyh8RELZFqMXWmc6",
  },
  
  GijGXx13yedhOXZq694U: {
    W: "AV1lKxUDArOcODrZAgaQ",
    N: "VSMgQcxUcd7j1anw4hmF",
    S: "XRzrWXGpgX2GcpgqSlYd",
  },
  
  I8hahrSpL3j8FdMCzp94: {
    S: "AV1lKxUDArOcODrZAgaQ",
    W: "PhbgBZBKSM4TQCALpORE",
    E: "VSMgQcxUcd7j1anw4hmF",
  },
  
  Jx2rD9TSjts2jlXn1ZXM: {
    N: "AV1lKxUDArOcODrZAgaQ",
    W: "NztlAyh8RELZFqMXWmc6",
    E: "XRzrWXGpgX2GcpgqSlYd",
  },
  
  NztlAyh8RELZFqMXWmc6: {
    E: "Jx2rD9TSjts2jlXn1ZXM",
    N: "BoDOb3lgb6Z3fMk8UhKP",
    S: "WzV0CcaKCs8gZbGGjVE4",
  },
  
  PhbgBZBKSM4TQCALpORE: {
    E: "I8hahrSpL3j8FdMCzp94",
    S: "BoDOb3lgb6Z3fMk8UhKP",
    N: "XWsVSANAskL3zh5F8DOH",
  },
  
  VSMgQcxUcd7j1anw4hmF: {
    W: "I8hahrSpL3j8FdMCzp94",
    S: "GijGXx13yedhOXZq694U",
    N: "h0byiPaNSwYdGFThGkzE",
  },
  
  WzV0CcaKCs8gZbGGjVE4: {
    N: "NztlAyh8RELZFqMXWmc6",
    S: "ksaaobFav35eX3BvVXAR",
  },
  
  XRzrWXGpgX2GcpgqSlYd: {
    W: "Jx2rD9TSjts2jlXn1ZXM",
    N: "GijGXx13yedhOXZq694U",
    S: "nov7SIQARK8xoowIeDDN",
  },
  
  XWsVSANAskL3zh5F8DOH: {
    S: "PhbgBZBKSM4TQCALpORE",
    E: "h0byiPaNSwYdGFThGkzE",
  },
  
  h0byiPaNSwYdGFThGkzE: {
    S: "VSMgQcxUcd7j1anw4hmF",
    W: "XWsVSANAskL3zh5F8DOH",
    E: "hoWsS4ofkurt87Bqk19l",
  },
  
  hoWsS4ofkurt87Bqk19l: {
    W: "h0byiPaNSwYdGFThGkzE",
    S: "rqZVYRoeTTOVsJKv3oGL",
  },
  
  ksaaobFav35eX3BvVXAR: {
    N: "WzV0CcaKCs8gZbGGjVE4",
    E: "nov7SIQARK8xoowIeDDN",
  },
  
  nov7SIQARK8xoowIeDDN: {
    W: "ksaaobFav35eX3BvVXAR",
    N: "XRzrWXGpgX2GcpgqSlYd",
    E: "oWUBdxUQTgHhCPSFBbB8",
  },
  
  oWUBdxUQTgHhCPSFBbB8: {
    W: "nov7SIQARK8xoowIeDDN",
    N: "tLVuYp6SBXlVESGfB7xg",
  },
  
  rqZVYRoeTTOVsJKv3oGL: {
    N: "hoWsS4ofkurt87Bqk19l",
    E: "tLVuYp6SBXlVESGfB7xg",
  },
  
  tLVuYp6SBXlVESGfB7xg: {
    W: "rqZVYRoeTTOVsJKv3oGL",
    S: "oWUBdxUQTgHhCPSFBbB8",
    E: "zYCxQlIXijeHjuwqCK7A",
  },
  
  zYCxQlIXijeHjuwqCK7A: {
    W: "tLVuYp6SBXlVESGfB7xg",
  },
};

// bulkUpdzateMapsLinks(mapGraph)