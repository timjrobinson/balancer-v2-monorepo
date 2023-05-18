import fs from 'fs';
import path from 'path';
import Task from './task';

import { Network } from './types';

const DEPLOYMENT_TXS_DIRECTORY = path.resolve(__dirname, '../deployment-txs');
const ADDRESSES_DIRECTORY = path.resolve(__dirname, '../addresses');
const CONTRACTS_DIRECTORY = path.resolve(__dirname, '../contracts');

export function saveContractDeploymentTransactionHash(
  deployedAddress: string,
  deploymentTransactionHash: string,
  network: Network
): void {
  if (network === 'hardhat') return;

  const filePath = path.join(DEPLOYMENT_TXS_DIRECTORY, `${network}.json`);
  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();

  // Load the existing content if any exists.
  const newFileContents: Record<string, string> = fileExists ? JSON.parse(fs.readFileSync(filePath).toString()) : {};

  // Write the new entry.
  newFileContents[deployedAddress] = deploymentTransactionHash;

  fs.writeFileSync(filePath, JSON.stringify(newFileContents, null, 2));
}

export function getContractDeploymentTransactionHash(deployedAddress: string, network: Network): string {
  const filePath = path.join(DEPLOYMENT_TXS_DIRECTORY, `${network}.json`);
  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  if (!fileExists) {
    throw Error(`Could not find file for deployment transaction hashes for network '${network}'`);
  }

  const deploymentTxs: Record<string, string> = JSON.parse(fs.readFileSync(filePath).toString());
  const txHash = deploymentTxs[deployedAddress];
  if (txHash === undefined) {
    throw Error(`No transaction hash for contract ${deployedAddress} on network '${network}'`);
  }

  return txHash;
}

/**
 * Saves a file with the canonical deployment addresses for all tasks in a given network.
 */
export function saveContractDeploymentAddresses(tasks: Task[], network: string): void {
  if (network === 'hardhat') return;

  const allTaskEntries = buildContractDeploymentAddressesEntries(tasks);
  const filePath = path.join(ADDRESSES_DIRECTORY, `${network}.json`);

  fs.writeFileSync(filePath, _stringifyEntries(allTaskEntries));
}

/**
 * Builds an object that maps deployment addresses to {task ID, contract name} for all given tasks.
 */
export function buildContractDeploymentAddressesEntries(tasks: Task[]): Record<string, { task: string; name: string }> {
  let allTaskEntries = {};

  for (const task of tasks) {
    const taskEntries = Object.fromEntries(
      Object.entries(task.output({ ensure: false })).map(([name, address]) => [address, { task: task.id, name }])
    );
    allTaskEntries = {
      ...allTaskEntries,
      ...taskEntries,
    };
  }

  return allTaskEntries;
}

/**
 * Saves a file with the canonical deployment addresses for all tasks in a given network.
 */
export function saveContractNameToAddressMap(tasks: Task[], network: string): void {
  if (network === 'hardhat') return;

  const allTaskEntries = buildContractNameToAddressMap(tasks);
  const filePath = path.join(CONTRACTS_DIRECTORY, `${network}.json`);

  fs.writeFileSync(filePath, _stringifyEntries(allTaskEntries));
}

/**
 * Builds an object that maps contract names to it's most recent address for all given tasks.
 */
export function buildContractNameToAddressMap(tasks: Task[]): Record<string, string> {
  let allTaskEntries = {};

  for (const task of tasks) {
    const taskEntries = task.output({ ensure: false });
    allTaskEntries = {
      ...allTaskEntries,
      ...taskEntries,
    };
  }

  const sortedEntries = Object.fromEntries(Object.entries(allTaskEntries).sort(([nameA], [nameB]) => nameA.localeCompare(nameB))) as Record<string, string>;

  return sortedEntries;
}

/**
 * Returns true if the existing deployment addresses file stored in `CONTRACT_ADDRESSES_DIRECTORY` matches the
 * canonical one for the given network; false otherwise.
 */
export function checkContractDeploymentAddresses(tasks: Task[], network: string): boolean {
  const allTaskEntries = buildContractDeploymentAddressesEntries(tasks);

  const filePath = path.join(ADDRESSES_DIRECTORY, `${network}.json`);
  const fileExists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();

  // Load the existing content if any exists.
  const existingFileContents: string = fileExists ? fs.readFileSync(filePath).toString() : '';

  return _stringifyEntries(allTaskEntries) === existingFileContents;
}

function _stringifyEntries(entries: object): string {
  return JSON.stringify(entries, null, 2);
}
