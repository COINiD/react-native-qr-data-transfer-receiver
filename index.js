import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import {
  Text, ViewPropTypes,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import md5 from 'md5';

class QrDataTransferReceiver extends PureComponent {
  constructor(props) {
    super(props);

    this.collectedData = new Map();

    this.state = {
      index: 0,
      length: 0,
    };
  }

  componentDidMount() {
    this.collectedData = new Map();
  }

  componentWillReceiveProps() {
  }

  componentWillUnmount() {
    delete this.collectedData;
  }

  _onSuccess = ({ data }) => {
    const { onComplete, onError } = this.props;
    const [dataInfo] = data.split('/', 1);
    const dataString = data.substr(data.indexOf('/')+1);
    let [index, length, checkSum] = dataInfo.split(':', 3);
    index = Number(index);
    length = Number(length);

    if (!this.collectedData.has(checkSum)) {
      this.collectedData.set(checkSum, new Map());
    }

    const collectionMap = this.collectedData.get(checkSum);

    if (!collectionMap.has(index)) {
      collectionMap.set(index, dataString);

      this.setState({
        index,
        length,
        checkSum,
      });

      if (collectionMap.size === length) {
        const sortedCollection = [...collectionMap.entries()].sort(([aKey], [bKey]) => (aKey - bKey)).map(([, value]) => value);
        const receivedData = sortedCollection.join('');
        const receivedCheckSum = md5(`${receivedData}`).toUpperCase();

        if (receivedCheckSum !== checkSum) {
          onError(`Checksum mismatch`);
          return false;
        }

        onComplete(receivedData);
      }
    }

    return true;
  }

  _renderTopContent = () => {
    const { topContent } = this.props;
    return topContent;
  }

  _renderBottomContent = () => {
    const { renderCompletedItems, bottomContent } = this.props;
    const { index, length, checkSum } = this.state;

    const getItemProps = () => {
      if (!this.collectedData.has(checkSum)) {
        return {
          index: 0,
          length: 0,
          collectedSize: 0,
          missingIndexes: [],
        };
      }

      const collectionMap = this.collectedData.get(checkSum);
      const collectionArray = Array(length).fill().map((e, i) => collectionMap.get(i));
      const missingIndexes = collectionArray
        .map((e, i) => (!e ? i : false))
        .filter(e => e !== false);

      return {
        index,
        length,
        collectedSize: collectionMap.size,
        missingIndexes,
      };
    };

    return (
      <React.Fragment>
        {bottomContent}
        {renderCompletedItems(getItemProps())}
      </React.Fragment>
    );
  }

  render() {
    const { cameraType } = this.props;
    const {
      topViewStyle, bottomViewStyle, customMarker, cameraStyle, fadeIn,
    } = this.props;

    return (
      <QRCodeScanner
        showMarker
        cameraType={cameraType}
        cameraStyle={cameraStyle}
        onRead={this._onSuccess}
        vibrate={false}
        reactivate
        topViewStyle={topViewStyle}
        topContent={this._renderTopContent()}
        bottomViewStyle={bottomViewStyle}
        bottomContent={this._renderBottomContent()}
        customMarker={customMarker}
        fadeIn={fadeIn}
      />
    );
  }
}

QrDataTransferReceiver.propTypes = {
  renderCompletedItems: PropTypes.func,
  onComplete: PropTypes.func,
  onError: PropTypes.func,
  topViewStyle: ViewPropTypes.style,
  topContent: PropTypes.element,
  bottomViewStyle: ViewPropTypes.style,
  bottomContent: PropTypes.element,
  customMarker: PropTypes.element,
  cameraStyle: ViewPropTypes.style,
  cameraType: PropTypes.string,
  fadeIn: PropTypes.bool,
};

QrDataTransferReceiver.defaultProps = {
  renderCompletedItems: ({
    index, length, collectedSize, missingIndexes,
  }) => (
    <Text>
      { `Progress: ${collectedSize}/${length}, Latest Index: ${index}, Missing ${missingIndexes.join(', ')}` }
    </Text>
  ),
  onComplete: (data) => { console.log({ data }); },
  onError: (error) => { console.log({ error }); },
  topViewStyle: null,
  topContent: null,
  bottomViewStyle: null,
  bottomContent: null,
  customMarker: null,
  cameraStyle: null,
  cameraType: 'back',
  fadeIn: false,
};

export default QrDataTransferReceiver;
