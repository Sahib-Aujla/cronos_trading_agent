// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVVSRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract SmartWallet {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error NOT_OWNER();
    error NOT_AGENT();
    error TOKEN_NOT_ALLOWED();
    error DAILY_LIMIT_EXCEEDED();
    error INVALID_ADDRESS();
    error INVALID_AMOUNT();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    event EmergencyWithdraw(address indexed token, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/
    address public owner;
    address public agent;

    uint256 public dailyLimit;
    uint256 public spentToday;
    uint256 public lastReset;

    mapping(address => bool) public allowedTokens;

    IVVSRouter public immutable router;
    address public immutable WCRO;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/
    modifier onlyOwner() {
        if (msg.sender != owner) revert NOT_OWNER();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NOT_AGENT();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    constructor(address _agent, uint256 _dailyLimit, address _router, address _wcro) {
        if (_agent == address(0) || _router == address(0) || _wcro == address(0)) revert INVALID_ADDRESS();

        owner = msg.sender;
        agent = _agent;
        dailyLimit = _dailyLimit;
        router = IVVSRouter(_router);
        WCRO = _wcro;
        lastReset = block.timestamp;
    }

    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function setAgent(address _agent) external onlyOwner {
        if (_agent == address(0)) revert INVALID_ADDRESS();
        agent = _agent;
    }

    function allowToken(address token, bool allowed) external onlyOwner {
        if (token == address(0)) revert INVALID_ADDRESS();
        allowedTokens[token] = allowed;
    }

    function setDailyLimit(uint256 limit) external onlyOwner {
        dailyLimit = limit;
    }

    /// Emergency token recovery
    function rescueToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner, amount);
        emit EmergencyWithdraw(token, amount);
    }

    /*//////////////////////////////////////////////////////////////
                          AGENT FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut) external onlyAgent {
        if (amountIn == 0) revert INVALID_AMOUNT();
        _resetIfNeeded();

        if (!allowedTokens[tokenIn] || !allowedTokens[tokenOut]) {
            revert TOKEN_NOT_ALLOWED();
        }

        if (spentToday + amountIn > dailyLimit) {
            revert DAILY_LIMIT_EXCEEDED();
        }

        spentToday += amountIn;

        IERC20(tokenIn).approve(address(router), 0);
        IERC20(tokenIn).approve(address(router), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts =
            router.swapExactTokensForTokens(amountIn, minAmountOut, path, address(this), block.timestamp + 300);

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amounts[1]);
    }

    /*//////////////////////////////////////////////////////////////
                          INTERNAL
    //////////////////////////////////////////////////////////////*/
    function _resetIfNeeded() internal {
        if (block.timestamp >= lastReset + 1 days) {
            spentToday = 0;
            lastReset = block.timestamp;
        }
    }
}
