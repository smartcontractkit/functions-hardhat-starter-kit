// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDAO {
    
    function mint(address to, uint256 amount) external view;

    function balanceOf(address account) external view returns (uint256 balance);
}