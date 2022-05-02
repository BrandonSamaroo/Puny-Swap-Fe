import React from 'react';
import favSvg from '../favorite.svg';
import chevRight from '../chevRight.svg';
import { Link } from 'react-router-dom';

export default function SwapCard(props) {
	return (
		<>
			<div className="container">
				<div className="swap-bookmark">
					<Link
						className="swap-bookmark-header"
						to={{
							pathname: `/exchange`,
							search: `?crypto1=${props.crypto1}&crypto2=${props.crypto2}&chain=${props.chain}`,
						}}
					>
						Swap {props.crypto1} to {props.crypto2}
					</Link>
					<div className="swap-bookmark-body">
						<div className="swap-card-crypto-from">
							<img className="swap-card-crypto-img" src={props.crypto1Img} alt="" />
						</div>
						<img src={chevRight} alt="" />
						<div className="swap-card-crypto-to">
							<img className="swap-card-crypto-img" src={props.crypto2Img} alt="" />
						</div>
					</div>
					<div className="swap-bookmark-footer" onClick={() => props.removeSwapRecord(props.crypto1, props.crypto2)}>
						<img src={favSvg} alt="favorite" />
					</div>
				</div>
			</div>
		</>
	);
}
