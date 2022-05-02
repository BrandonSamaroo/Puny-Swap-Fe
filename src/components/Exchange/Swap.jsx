import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import Moralis from 'moralis';
import CoinRow from './CoinRow';
import axios from 'axios';
import favSvg from '../../favorite.svg';
import favSvgBdr from '../../favorite_border.svg';
import Swal from 'sweetalert2';
import { useLocation } from 'react-router-dom';
const { ethereum } = window;
// require('dotenv').config();

export default function Swap(props) {
	// const serverUrl = process.env.moralisURL;
	const serverUrl = 'https://d8jmhb5ho8gz.usemoralis.com:2053/server';
	// const appId = process.env.moralisID;
	const appId = 'A1ke09rT3uacaTObuqpOhW407Gl4ZBhGnhgnZ6dd';
	const [user, setUser] = useState();
	const [tokenModal, setTokenModal] = useState('none');
	const [currentTradeFrom, setCurrentTradeFrom] = useState([]);
	const [currentTradeTo, setCurrentTradeTo] = useState([]);
	const [initialized, setInitialized] = useState(false);
	const [displayTokens, setDisplayTokens] = useState([]);
	const [tokensObj, setTokensObj] = useState();
	const [tokensArr, setTokensArr] = useState();
	const [toAmount, setToAmount] = useState('');
	const [gasEstimate, setGasEstimate] = useState('');
	const [side, setSide] = useState();
	const [chainFilter, setChainFilter] = useState('');
	const [favorite, setFavorite] = useState(false);
	const search = useLocation().search;
	const crypto1Param = new URLSearchParams(search).get('crypto1');
	const crypto2Param = new URLSearchParams(search).get('crypto2');
	const chainFilterParam = new URLSearchParams(search).get('chain');
	const [cryptoParamsInitialized, setCryptoParamsInitialized] = useState(false);

	async function login() {
		try {
			setUser(await Moralis.authenticate());
			console.log('Logged in');
		} catch (error) {
			console.log(error);
		}
	}

	async function listAvailableTokens(chain) {
		try {
			const result = await Moralis.Plugins.oneInch.getSupportedTokens({
				chain: chain,
				// The blockchain you want to use (eth/bsc/polygon)
			});
			setDisplayTokens(Object.entries(result.tokens));
			setTokensObj(result.tokens);
			setTokensArr(Object.entries(result.tokens));
		} catch (error) {
			console.log(error);
		}
	}
	function selectToken(address, side) {
		closeModal();
		console.log(side);
		console.log(tokensObj[address]);
		if (side === 'from') {
			setCurrentTradeFrom(tokensObj[address]);
			if (currentTradeTo.length !== 0) handleSwapBookmark(tokensObj[address].symbol, currentTradeTo.symbol);
		}
		if (side === 'to') {
			setCurrentTradeTo(tokensObj[address]);
			if (currentTradeFrom.length !== 0) handleSwapBookmark(currentTradeFrom.symbol, tokensObj[address].symbol);
		}
	}

	function openModal(tempSide) {
		setSide(tempSide);
		const tempTokens = Object.entries(tokensObj);
		setDisplayTokens(tempTokens);
		setTokenModal('block');
	}
	function searchChange(e) {
		setDisplayTokens(tokensArr.filter((token) => token[1].symbol.toLowerCase().includes(e.target.value.toLowerCase()) || token[1].name.toLowerCase().includes(e.target.value.toLowerCase())));
	}
	function closeModal() {
		document.getElementById('searchModal').value = '';
		setTokenModal('none');
	}
	async function getQuote(e) {
		if (Number(e.target.value) !== 0 && currentTradeFrom && currentTradeTo) {
			console.log(currentTradeFrom);
			console.log(currentTradeTo);
			let amount = Number(e.target.value * 10 ** currentTradeFrom.decimals);
			console.log(amount);
			console.log(chainFilter);
			const quote = await Moralis.Plugins.oneInch.quote({
				chain: chainFilter,
				// The blockchain you want to use (eth/bsc/polygon)
				fromTokenAddress: currentTradeFrom.address,
				// The token you want to swap
				toTokenAddress: currentTradeTo.address,
				// The token you want to receive
				amount: amount,
			});
			setGasEstimate((quote.estimatedGas * 0.000000000905).toFixed(6));
			setToAmount(quote.toTokenAmount / 10 ** quote.toToken.decimals);
		}
	}
	async function init() {
		if (!initialized) {
			try {
				Moralis.start({ serverUrl, appId });
				await Moralis.initPlugins();
				if (chainFilterParam) {
					setChainFilter(chainFilterParam);
				} else {
					setChainFilter('eth');
				}
				await listAvailableTokens('eth');
				setInitialized(true);
			} catch (error) {
				console.log(error);
			}
		}
	}
	async function trySwap() {
		if (currentTradeFrom.address === currentTradeTo.address) {
			Swal.fire({
				icon: 'error',
				title: 'Oops...',
				text: 'Cannot swap between same coin!',
			});
			return;
		}
		let address = Moralis.User.current().get('ethAddress');
		let amount = Number(document.getElementById('from_amount').value * 10 ** currentTradeFrom.decimals);
		if (currentTradeFrom.symbol !== 'ETH') {
			const allowance = await Moralis.Plugins.oneInch.hasAllowance({
				chain: chainFilter,
				// The blockchain you want to use (eth/bsc/polygon)
				fromTokenAddress: currentTradeFrom.address,
				// The token you want to swap
				fromAddress: address,
				// Your wallet address
				amount: amount,
			});
			console.log(allowance);
			if (!allowance) {
				await Moralis.Plugins.oneInch.approve({
					chain: chainFilter,
					// The blockchain you want to use (eth/bsc/polygon)
					tokenAddress: currentTradeFrom.address,
					// The token you want to swap
					fromAddress: address,
					// Your wallet address
				});
			}
		}
		await doSwap(address, amount);
	}

	async function doSwap(userAddress, amount) {
		try {
			return await Moralis.Plugins.oneInch.swap({
				chain: chainFilter,
				// The blockchain you want to use (eth/bsc/polygon)
				fromTokenAddress: currentTradeFrom.address,
				// The token you want to swap
				toTokenAddress: currentTradeTo.address,
				// The token you want to receive
				amount: amount,
				fromAddress: userAddress,
				// Your wallet address
				slippage: 1,
			});
		} catch (error) {
			console.log(error);
			Swal.fire({
				icon: 'error',
				title: 'Oh no...',
				text: 'The swap has failed!',
			});
		}
	}

	useEffect(() => {
		init();
	});
	useEffect(() => {
		if (initialized) {
			if (crypto1Param && !cryptoParamsInitialized) {
				setCryptoParamsInitialized(true);
				let crypto1 = tokensArr.filter((token) => token[1].symbol == crypto1Param);
				let crypto2 = tokensArr.filter((token) => token[1].symbol == crypto2Param);
				if (crypto1.length !== 0 && crypto2 !== 0) {
					setCurrentTradeFrom(tokensObj[crypto1[0][0]]);
					setCurrentTradeTo(tokensObj[crypto2[0][0]]);
					handleSwapBookmark(tokensObj[crypto1[0][0]].symbol, tokensObj[crypto2[0][0]].symbol);
				}
			}
		}
	});
	function handleChainFilter(chain) {
		setChainFilter(chain);
		listAvailableTokens(chain);
		setCurrentTradeFrom([]);
		setCurrentTradeTo([]);
		setGasEstimate('');
		setToAmount('');
		document.getElementById('from_amount').value = '';
	}
	const addSwap = (e) => {
		e.preventDefault();
		e.stopPropagation();
		axios
			.post('addSwap', { crypto1: currentTradeFrom.symbol, crypto2: currentTradeTo.symbol, chain: chainFilter, crypto1Img: currentTradeFrom.logoURI, crypto2Img: currentTradeTo.logoURI, owner: props.user })
			.then((result) => {
				setFavorite(false);
			})
			.then((result) => {
				handleSwapBookmark(currentTradeFrom.symbol, currentTradeTo.symbol);
			})
			.catch((err) => {
				console.log(err);
			});
	};
	const removeSwap = (e) => {
		e.preventDefault();
		e.stopPropagation();
		axios
			.post('removeSwap', { crypto1: currentTradeFrom.symbol, crypto2: currentTradeTo.symbol, owner: props.user })
			.then((result) => {
				setFavorite(true);
			})
			.then((result) => {
				handleSwapBookmark(currentTradeFrom.symbol, currentTradeTo.symbol);
			})
			.catch((err) => {
				console.log(err);
			});
	};
	const checkBookmarked = async (address1, address2) => {
		try {
			const response = await axios.post('swapIsBookmarked', { crypto1: address1, crypto2: address2, user: props.user });
			return Promise.resolve(response);
		} catch (error) {
			console.log(error);
		}
	};
	function handleSwapBookmark(address1, address2) {
		let isBookmarked = Promise.resolve(checkBookmarked(address1, address2));
		isBookmarked.then(function (result) {
			setFavorite(result.data);
		});
	}
	return (
		<div id="swap">
			<div id="swap_form">
				<div className="chain_filters">
					<div className="exchange_filters">
						<div onClick={() => handleChainFilter('eth')} className={chainFilter === 'eth' ? 'exchange_filter is-active' : 'exchange_filter'}>
							Eth
						</div>
						<div onClick={() => handleChainFilter('bsc')} className={chainFilter === 'bsc' ? 'exchange_filter is-active' : 'exchange_filter'}>
							Bsc
						</div>
						<div onClick={() => handleChainFilter('polygon')} className={chainFilter === 'polygon' ? 'exchange_filter is-active' : 'exchange_filter'}>
							Ply
						</div>
					</div>
				</div>
				<div id="swap_bookmark">
					{currentTradeFrom.length === 0 || currentTradeTo.length === 0 ? (
						<div></div>
					) : !favorite ? (
						<div id="swap_bookmark_text" onClick={(e) => addSwap(e)}>
							<span>Save this swap &nbsp;</span>
							<img src={favSvgBdr} alt="favorite" />
						</div>
					) : (
						<div id="swap_bookmark_text" onClick={(e) => removeSwap(e)}>
							<span>Remove this swap &nbsp;</span>
							<img src={favSvg} alt="favorite" />
						</div>
					)}
				</div>
				<div className="swapbox">
					<div className="swapforms swapform_top">
						<div
							className="swapbox_select token_select"
							style={{ display: currentTradeFrom.length === 0 ? 'flex' : 'block', justifyContent: currentTradeFrom.length === 0 ? 'center' : 'none', alignItems: currentTradeFrom.length === 0 ? 'center' : 'none' }}
							id="from_token_select"
							onClick={() => openModal('from')}
						>
							{currentTradeFrom.length === 0 ? (
								<div className="token_select_label">
									Select a token <span style={{ fontSize: '10px' }}>▼</span>
								</div>
							) : (
								<div>
									<img className="token_image" id="from_token_img" src={currentTradeFrom.logoURI} alt="Token from" />
									<span id="from_token_text">&nbsp;{currentTradeFrom.symbol}</span>
								</div>
							)}
						</div>
						<div className="swapbox_select">
							<Form.Control required className="number form-control" placeholder="Amount" id="from_amount" onChange={(e) => getQuote(e)}></Form.Control>
						</div>
					</div>
					<div className="swapforms swapform_bottom">
						<div
							className="swapbox_select token_select"
							style={{ display: currentTradeTo.length === 0 ? 'flex' : 'block', justifyContent: currentTradeTo.length === 0 ? 'center' : 'none', alignItems: currentTradeTo.length === 0 ? 'center' : 'none' }}
							id="to_token_select"
							onClick={() => openModal('to')}
						>
							{currentTradeTo.length === 0 ? (
								<div className="token_select_label">
									Select a token <span style={{ fontSize: '10px' }}>▼</span>
								</div>
							) : (
								<div>
									<img className="token_image" id="to_token_img" src={currentTradeTo.logoURI} alt="Token to" />
									<span id="to_token_text">&nbsp;{currentTradeTo.symbol}</span>
								</div>
							)}
						</div>
						<div className="swapbox_select">
							<Form.Control disabled required className="number form-control" placeholder="Amount" id="to_amount" value={toAmount}></Form.Control>
						</div>
					</div>
				</div>
				<div id="swap_fees_cont">
					{gasEstimate ? (
						<div id="swap_fees">
							Fees: <span id="gas_estimate">{gasEstimate}</span> {chainFilter === 'eth' ? 'eth' : chainFilter === 'bsc' ? 'bnb' : 'polygon'}
						</div>
					) : (
						<div></div>
					)}
				</div>
				<Button className="exchange_button" id="swap_button" onClick={user ? trySwap : login}>
					{user ? 'Swap' : 'Moralis Login'}
				</Button>
			</div>
			<div className="modal" id="token_modal" tabIndex="-1" role="dialog" style={{ display: tokenModal }}>
				<div className="modal-dialog" role="document">
					<div className="modal-content">
						<div className="modal-header">
							<h5 className="modal-title">Select Token</h5>
							<button className="btn-close" id="modal_close" onClick={closeModal} data-dismiss="modal"></button>
						</div>
						<div className="modal_body">
							<Form.Control className=" form-control" placeholder="Search" id="searchModal" onChange={(e) => searchChange(e)}></Form.Control>
							<div id="token_list">
								{displayTokens.map((token, i) => {
									return <CoinRow key={i} token={token[1]} dataAddress={token[0]} side={side} selectToken={selectToken}></CoinRow>;
								})}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
